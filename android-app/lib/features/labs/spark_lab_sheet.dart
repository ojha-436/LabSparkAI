import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../core/api/agora_config.dart';
import '../../core/theme/app_tokens.dart';
import '../../core/theme/logo.dart';
import '../../data/models/lab.dart';
import '../spark/agora_transcript.dart';
import '../spark/agora_voice_service.dart';
import '../spark/spark_language.dart';
import '../spark/spark_conversation.dart';
import '../spark/spark_repository.dart';
import '../spark/spark_tts_service.dart';

/// Voice-enabled Spark chat bottom sheet.
///
/// Uses the shared [SparkTts] singleton (same voice everywhere) and the
/// persistent [sparkConversationProvider] so the student sees the full
/// history of what Spark narrated during the lab AND their own Q&A
/// carries across open/close of the sheet.
///
/// Two voice modes, and the older one is never removed:
///
///  • **Turn-based (default).** `speech_to_text` → `/api/spark/ask` →
///    `flutter_tts`. Works offline-ish, no per-minute cost, always available.
///  • **Live (Agora).** A ConvoAI agent joins an RTC channel and holds a
///    full-duplex conversation — the student can interrupt mid-sentence.
///    Gemini is still the brain; Agora owns transport, ASR, TTS and VAD.
///
/// Live is offered only when an App ID is compiled in, and any failure to
/// establish it falls straight back to turn-based rather than dead-ending.
class SparkLabSheet extends ConsumerStatefulWidget {
  const SparkLabSheet({super.key, required this.lab});
  final Lab lab;
  @override
  ConsumerState<SparkLabSheet> createState() => _SparkLabSheetState();
}

class _SparkLabSheetState extends ConsumerState<SparkLabSheet> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _stt = SpeechToText();
  /// Captured in [initState] rather than read in [dispose] — `ref` is not
  /// guaranteed usable once disposal has started, and closing the sheet is
  /// precisely when we need to hang up a live session.
  late final AgoraVoiceService _voice;
  bool _thinking = false;
  bool _listening = false;
  bool _sttReady = false;

  @override
  void initState() {
    super.initState();
    _voice = ref.read(agoraVoiceServiceProvider);
    _initStt();
    // If this is the very first time the student is opening Spark for
    // this lab, emit a warm proactive greeting. Otherwise pick up the
    // conversation exactly where it left off.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final existing = ref.read(sparkConversationProvider(widget.lab.id));
      if (existing.isEmpty) _greet();
      // Always scroll to the tail so the latest message is in view.
      _bump(instant: true);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    _stt.stop();
    // Closing the sheet must end any live session. An orphaned ConvoAI agent
    // keeps billing per minute until `idle_timeout` fires, so this is a cost
    // bug, not just a tidiness one. Fire-and-forget: `dispose` can't await,
    // and the service's stop path is already failure-tolerant.
    if (_voice.isActive) _voice.stop();
    super.dispose();
  }

  /// Starts or ends a live conversation.
  ///
  /// Starting one silences the turn-based path first — otherwise `flutter_tts`
  /// and the agent's TTS talk over each other into the same speaker, which
  /// sounds broken and also feeds Spark's own voice back into the mic.
  Future<void> _toggleLive() async {
    HapticFeedback.selectionClick();

    if (_voice.isActive) {
      // Capture before stopping — teardown clears the transcript.
      final turns = List<TranscriptTurn>.of(_voice.state.value.transcript);
      await _voice.stop();
      _persistTranscript(turns);
      return;
    }

    await SparkTts.instance.stop();
    if (_listening) {
      await _stt.stop();
      if (mounted) setState(() => _listening = false);
    }

    final ok = await _voice.start(
      labId: widget.lab.id,
      labTitle: widget.lab.title,
      language: ref.read(sparkLanguageProvider),
    );

    if (!ok && mounted) {
      final reason = _voice.state.value.error ?? 'Live voice is unavailable.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(reason),
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  /// Folds a finished live conversation into the lab's persisted history, so
  /// the student can scroll back through what was actually said instead of
  /// losing it the moment they hang up.
  ///
  /// Only settled turns are kept: an in-progress turn is a half-recognised
  /// fragment that would read as gibberish in the history.
  void _persistTranscript(List<TranscriptTurn> turns) {
    final notifier = ref.read(sparkConversationProvider(widget.lab.id).notifier);
    for (final turn in turns) {
      if (!turn.isFinal) continue;
      final text = turn.text.trim();
      if (text.isEmpty) continue;
      notifier.append(SparkMessage(
        text: turn.status == TranscriptTurnStatus.interrupted
            ? '$text…'
            : text,
        fromSpark: turn.speaker == TranscriptSpeaker.spark,
        timestamp: DateTime.fromMillisecondsSinceEpoch(turn.createdAtMillis),
        // Already spoken aloud during the live session — must not be
        // re-narrated by flutter_tts when the sheet rebuilds.
        spoken: true,
      ));
    }
    if (turns.isNotEmpty) _bump();
  }

  Future<void> _initStt() async {
    try {
      final ok = await _stt.initialize(
        onStatus: (s) {
          if (!mounted) return;
          setState(() => _listening = s == 'listening');
        },
        onError: (_) {
          if (!mounted) return;
          setState(() => _listening = false);
        },
      );
      if (mounted) setState(() => _sttReady = ok);
    } catch (_) {
      if (mounted) setState(() => _sttReady = false);
    }
  }

  Future<void> _greet() async {
    final greeting = _greetingFor(widget.lab);
    ref.read(sparkConversationProvider(widget.lab.id).notifier).append(
          SparkMessage(
            text: greeting,
            fromSpark: true,
            timestamp: DateTime.now(),
            spoken: true,
          ),
        );
    _bump();
    await SparkTts.instance.speak(greeting);
  }

  Future<void> _toggleMic() async {
    HapticFeedback.selectionClick();
    if (_listening) {
      await _stt.stop();
      setState(() => _listening = false);
      return;
    }
    if (!_sttReady) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text(
          'Voice input not available — grant microphone permission in Settings.',
        ),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    await SparkTts.instance.stop();
    await _stt.listen(
      onResult: (result) {
        _controller.text = result.recognizedWords;
        if (result.finalResult) {
          _stt.stop();
          setState(() => _listening = false);
          if (result.recognizedWords.trim().isNotEmpty) _send();
        }
      },
      listenOptions: SpeechListenOptions(
        listenMode: ListenMode.confirmation,
        cancelOnError: true,
        partialResults: true,
      ),
      pauseFor: const Duration(seconds: 3),
      localeId: 'en_IN',
    );
    setState(() => _listening = true);
  }

  Future<void> _send([String? forced]) async {
    final text = (forced ?? _controller.text).trim();
    if (text.isEmpty || _thinking) return;

    HapticFeedback.selectionClick();
    ref.read(sparkConversationProvider(widget.lab.id).notifier).append(
          SparkMessage(
            text: text,
            fromSpark: false,
            timestamp: DateTime.now(),
          ),
        );
    setState(() {
      _thinking = true;
      _controller.clear();
    });
    _bump();

    final answer = await ref.read(sparkRepositoryProvider).ask(
          question: text,
          experiment: widget.lab.title,
        );

    if (!mounted) return;
    ref.read(sparkConversationProvider(widget.lab.id).notifier).append(
          SparkMessage(
            text: answer,
            fromSpark: true,
            timestamp: DateTime.now(),
            spoken: true,
          ),
        );
    setState(() => _thinking = false);
    _bump();
    await SparkTts.instance.speak(answer);
  }

  void _bump({bool instant = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      final target = _scroll.position.maxScrollExtent + 200;
      if (instant) {
        _scroll.jumpTo(target);
      } else {
        _scroll.animateTo(
          target,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(sparkConversationProvider(widget.lab.id));
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;

    return ValueListenableBuilder<SparkVoiceState>(
      valueListenable: _voice.state,
      builder: (context, live, _) => _buildSheet(context, messages, viewInsets, live),
    );
  }

  Widget _buildSheet(
    BuildContext context,
    List<SparkMessage> messages,
    double viewInsets,
    SparkVoiceState live,
  ) {
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: DraggableScrollableSheet(
        initialChildSize: 0.78,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scroll) {
          final scheme = Theme.of(context).colorScheme;
          return Container(
            decoration: BoxDecoration(
              color: scheme.surface,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.28),
                  blurRadius: 24,
                  offset: const Offset(0, -6),
                ),
              ],
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 10, bottom: 6),
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: scheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                _Header(
                  lab: widget.lab,
                  thinking: _thinking,
                  listening: _listening,
                  live: live,
                  liveAvailable: agoraConfigured,
                  hasHistory: messages.length > 1,
                  onToggleLive: _toggleLive,
                  onClose: () => Navigator.of(context).pop(),
                  onClear: () {
                    ref
                        .read(sparkConversationProvider(widget.lab.id).notifier)
                        .clear();
                    _greet();
                  },
                ),
                const Divider(height: 1),
                Expanded(
                  // The saved history ALWAYS stays on screen. Live turns are
                  // appended beneath it, never substituted for it — an earlier
                  // version swapped the list out, which meant a session with
                  // no transcript showed the student a blank panel.
                  child: _ConversationList(
                    scroll: _scroll,
                    messages: messages,
                    thinking: _thinking,
                    live: live,
                  ),
                ),
                if (messages.length <= 1 && !live.isActive)
                  _SuggestionStrip(lab: widget.lab, onTap: _send),
                // While live, the composer is replaced rather than merely
                // disabled: sending text would fire the turn-based Gemini
                // path and speak over the agent through the same speaker.
                // Cross-fade rather than snap: the bar and the composer are
                // different heights, and a hard swap reads as a glitch.
                AnimatedSize(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOut,
                  alignment: Alignment.topCenter,
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: live.isActive
                        ? _LiveVoiceBar(
                            key: const ValueKey('live'),
                            state: live,
                            onMute: () => _voice.setMuted(!live.muted),
                            onEnd: _toggleLive,
                          )
                        : _Composer(
                            key: const ValueKey('composer'),
                            controller: _controller,
                            enabled: !_thinking,
                            listening: _listening,
                            onSend: () => _send(),
                            onMic: _toggleMic,
                            sttReady: _sttReady,
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _greetingFor(Lab lab) {
    switch (lab.id) {
      case 'acids-bases':
        return "Hi! I'm Spark. Today we're testing whether everyday things are acids or bases with litmus paper. Before we start — do you remember what colour blue litmus turns in an acid?";
      case 'solubility':
        return "Hey there! I'm Spark. Today we'll find out which substances dissolve in water. Quick warm-up — do you think sugar and sand behave the same way in water?";
      case 'magnetism':
        return "Hi! I'm Spark. Today we're seeing which materials a magnet pulls. Take a guess — will copper stick to the magnet or not?";
      case 'circuits':
        return "Hi! I'm Spark. Today we'll wire a bulb, battery, and switch into a circuit. First — what do you think makes a bulb glow when you flip the switch?";
      case 'friction':
        return "Hi! I'm Spark. Today we'll compare friction on rough versus smooth surfaces. What do you think — does a marble roll further on sandpaper or on glass?";
      default:
        return "Hi! I'm Spark. Today we're doing ${lab.title}. Tap any substance in the lab and I'll explain what's happening — or ask me anything.";
    }
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.lab,
    required this.thinking,
    required this.listening,
    required this.live,
    required this.liveAvailable,
    required this.hasHistory,
    required this.onToggleLive,
    required this.onClose,
    required this.onClear,
  });
  final Lab lab;
  final bool thinking;
  final bool listening;
  final SparkVoiceState live;
  final bool liveAvailable;
  final bool hasHistory;
  final VoidCallback onToggleLive;
  final VoidCallback onClose;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    // The live session outranks the turn-based indicators — when it's up,
    // that IS the state the student cares about.
    // While live, the engine's own agent state is the truth — it leads the
    // audio slightly, so the label changes as Spark starts rather than a beat
    // after the student already heard it.
    final (String status, Color statusColor) = switch (live.status) {
      SparkVoiceStatus.starting => ('connecting…', LabSparkTokens.amber500),
      SparkVoiceStatus.connecting => ('waking Spark…', LabSparkTokens.amber500),
      SparkVoiceStatus.live => switch (live.agentState) {
          AgentState.speaking =>
            ('live · Spark is speaking — cut in any time', LabSparkTokens.indigo600),
          AgentState.thinking => ('live · thinking…', LabSparkTokens.amber500),
          AgentState.listening => ('live · listening', LabSparkTokens.rose600),
          _ => ('live · just start talking', LabSparkTokens.teal600),
        },
      SparkVoiceStatus.ending => ('ending…', LabSparkTokens.slate500),
      _ when listening => ('listening…', LabSparkTokens.rose600),
      _ when thinking => ('thinking…', LabSparkTokens.amber500),
      _ => ('online · your lab guide', LabSparkTokens.teal600),
    };
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 6, 6, 12),
      child: Row(
        children: [
          const LabSparkLogoTile(size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Ask Spark',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                    )),
                Row(
                  children: [
                    Container(
                      width: 7, height: 7,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(status,
                        style: TextStyle(
                          fontSize: 11.5,
                          color: statusColor,
                          fontWeight: FontWeight.w700,
                        )),
                  ],
                ),
              ],
            ),
          ),
          // Hidden entirely when no App ID is compiled in — better than a
          // button whose only possible outcome is an error.
          if (liveAvailable)
            IconButton(
              onPressed: onToggleLive,
              icon: Icon(
                live.isActive
                    ? Icons.graphic_eq_rounded
                    : Icons.record_voice_over_outlined,
                color: live.isActive ? LabSparkTokens.indigo600 : null,
              ),
              tooltip: live.isActive ? 'End live voice' : 'Talk live to Spark',
            ),
          if (hasHistory && !live.isActive)
            IconButton(
              onPressed: onClear,
              icon: const Icon(Icons.delete_outline_rounded),
              tooltip: 'Clear conversation',
            ),
          IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Close',
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.msg});
  final SparkMessage msg;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final align = msg.fromSpark ? Alignment.centerLeft : Alignment.centerRight;
    final bg = msg.fromSpark
        ? scheme.surfaceContainerHigh
        : LabSparkTokens.teal600;
    final fg = msg.fromSpark ? scheme.onSurface : Colors.white;
    return Container(
      alignment: align,
      padding: const EdgeInsets.only(bottom: 8),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.82,
        ),
        child: Column(
          crossAxisAlignment:
              msg.fromSpark ? CrossAxisAlignment.start : CrossAxisAlignment.end,
          children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                msg.text,
                style: TextStyle(color: fg, fontSize: 14.5, height: 1.45),
              ),
            ),
            if (msg.fromSpark && msg.spoken)
              Padding(
                padding: const EdgeInsets.only(top: 3, left: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.volume_up_rounded,
                        size: 11, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      'spoken',
                      style: TextStyle(
                        fontSize: 10,
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ThinkingBubble extends StatelessWidget {
  const _ThinkingBubble();
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            return Padding(
              padding: EdgeInsets.only(right: i < 2 ? 5 : 0),
              child: _Dot(delay: i * 200),
            );
          }),
        ),
      ),
    );
  }
}

class _Dot extends StatefulWidget {
  const _Dot({required this.delay});
  final int delay;
  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 800),
  );
  @override
  void initState() {
    super.initState();
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _c.repeat(reverse: true);
    });
  }
  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.25, end: 1.0).animate(_c),
      child: Container(
        width: 6, height: 6,
        decoration: const BoxDecoration(
          color: LabSparkTokens.teal600,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

class _SuggestionStrip extends StatelessWidget {
  const _SuggestionStrip({required this.lab, required this.onTap});
  final Lab lab;
  final ValueChanged<String> onTap;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          children: [
            for (final s in _suggestionsFor(lab))
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Material(
                  color: scheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(100),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(100),
                    onTap: () => onTap(s),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.auto_awesome_rounded,
                              color: LabSparkTokens.teal600, size: 14),
                          const SizedBox(width: 6),
                          Text(s,
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                              )),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  List<String> _suggestionsFor(Lab lab) {
    switch (lab.id) {
      case 'acids-bases':
        return const [
          'What is litmus paper?',
          'Give me a hint',
          'Is soap acidic or basic?',
        ];
      case 'solubility':
        return const [
          'Why does sugar dissolve?',
          'What if I add oil?',
          'Give me a hint',
        ];
      case 'circuits':
        return const [
          'What is voltage?',
          'Series vs parallel?',
          'Give me a hint',
        ];
      case 'magnetism':
        return const [
          'Which metals are magnetic?',
          'How does a magnet work?',
          'Give me a hint',
        ];
      default:
        return const [
          'Give me a hint',
          'What am I observing?',
          'Explain this concept',
        ];
    }
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    super.key,
    required this.controller,
    required this.enabled,
    required this.listening,
    required this.onSend,
    required this.onMic,
    required this.sttReady,
  });
  final TextEditingController controller;
  final bool enabled;
  final bool listening;
  final VoidCallback onSend;
  final VoidCallback onMic;
  final bool sttReady;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
        decoration: BoxDecoration(
          color: scheme.surface,
          border: Border(top: BorderSide(color: scheme.outlineVariant)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _MicButton(
              listening: listening,
              enabled: sttReady && enabled,
              onTap: onMic,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: controller,
                enabled: enabled,
                maxLines: 4,
                minLines: 1,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
                decoration: InputDecoration(
                  hintText:
                      listening ? 'Listening…' : 'Type or tap the mic…',
                  filled: true,
                  fillColor: scheme.surfaceContainerHigh,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(22),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Material(
              color: enabled
                  ? LabSparkTokens.teal600
                  : scheme.surfaceContainerHigh,
              shape: const CircleBorder(),
              child: InkWell(
                onTap: enabled ? onSend : null,
                customBorder: const CircleBorder(),
                child: SizedBox(
                  width: 44, height: 44,
                  child: Icon(
                    Icons.send_rounded,
                    color: enabled ? Colors.white : scheme.onSurfaceVariant,
                    size: 20,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MicButton extends StatelessWidget {
  const _MicButton({
    required this.listening,
    required this.enabled,
    required this.onTap,
  });
  final bool listening;
  final bool enabled;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = listening
        ? LabSparkTokens.rose600
        : (enabled ? LabSparkTokens.teal600 : scheme.surfaceContainerHigh);
    final icon = listening ? Icons.stop_rounded : Icons.mic_rounded;
    return Material(
      color: bg,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: enabled ? onTap : null,
        customBorder: const CircleBorder(),
        child: Container(
          width: 46, height: 46,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: listening
                ? [
                    BoxShadow(
                      color: LabSparkTokens.rose600.withValues(alpha: 0.4),
                      blurRadius: 14,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
          ),
          child: Icon(
            icon,
            color: enabled ? Colors.white : scheme.onSurfaceVariant,
            size: 22,
          ),
        ),
      ),
    );
  }
}

/// Replaces the text composer while an Agora live session is up.
///
/// There is no send button and no text field on purpose: during a live
/// session the student just talks. The only controls that make sense are
/// mute and hang up.
class _LiveVoiceBar extends StatelessWidget {
  const _LiveVoiceBar({
    super.key,
    required this.state,
    required this.onMute,
    required this.onEnd,
  });

  final SparkVoiceState state;
  final VoidCallback onMute;
  final VoidCallback onEnd;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final connecting = state.status == SparkVoiceStatus.starting ||
        state.status == SparkVoiceStatus.connecting;

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        decoration: BoxDecoration(
          color: scheme.surface,
          border: Border(top: BorderSide(color: scheme.outlineVariant)),
        ),
        child: Row(
          children: [
            _VoiceOrb(
              speaking: state.sparkSpeaking,
              connecting: connecting,
              muted: state.muted,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    connecting
                        ? 'Connecting to Spark…'
                        : (state.muted ? 'Mic off' : 'Live · talk any time'),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    connecting
                        ? 'Setting up the voice line'
                        : 'You can interrupt Spark mid-sentence',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: connecting ? null : onMute,
              icon: Icon(
                state.muted ? Icons.mic_off_rounded : Icons.mic_rounded,
                color: state.muted
                    ? LabSparkTokens.rose600
                    : scheme.onSurfaceVariant,
              ),
              tooltip: state.muted ? 'Unmute' : 'Mute',
            ),
            const SizedBox(width: 4),
            Material(
              color: LabSparkTokens.rose600,
              shape: const CircleBorder(),
              child: InkWell(
                onTap: onEnd,
                customBorder: const CircleBorder(),
                child: const SizedBox(
                  width: 46,
                  height: 46,
                  child: Icon(Icons.call_end_rounded,
                      color: Colors.white, size: 22),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pulses while Spark is actually speaking — driven by Agora's volume
/// indication on the agent's uid, so it tracks real audio rather than
/// guessing from turn state.
class _VoiceOrb extends StatelessWidget {
  const _VoiceOrb({
    required this.speaking,
    required this.connecting,
    required this.muted,
  });

  final bool speaking;
  final bool connecting;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final color = muted
        ? LabSparkTokens.slate400
        : (speaking ? LabSparkTokens.indigo600 : LabSparkTokens.teal600);

    if (connecting) {
      return const SizedBox(
        width: 42,
        height: 42,
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.4),
          ),
        ),
      );
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: speaking
            ? [
                BoxShadow(
                  color: color.withValues(alpha: 0.45),
                  blurRadius: 16,
                  spreadRadius: 3,
                ),
              ]
            : null,
      ),
      child: Icon(
        muted ? Icons.mic_off_rounded : Icons.auto_awesome_rounded,
        color: Colors.white,
        size: 20,
      ),
    );
  }
}

/// The conversation panel.
///
/// Saved history first, then any live turns from the current session, then a
/// status footer. Structured this way so the panel is **never empty** during a
/// live session: if signaling is unavailable the student still sees their lab
/// history plus a live status line, rather than a blank rectangle.
class _ConversationList extends StatefulWidget {
  const _ConversationList({
    required this.scroll,
    required this.messages,
    required this.thinking,
    required this.live,
  });

  final ScrollController scroll;
  final List<SparkMessage> messages;
  final bool thinking;
  final SparkVoiceState live;

  @override
  State<_ConversationList> createState() => _ConversationListState();
}

class _ConversationListState extends State<_ConversationList> {
  @override
  void didUpdateWidget(_ConversationList old) {
    super.didUpdateWidget(old);
    // A streaming turn grows in place, so following only on count changes
    // would leave the newest text off-screen mid-sentence.
    final grew = widget.messages.length != old.messages.length ||
        widget.live.transcript.length != old.live.transcript.length ||
        _tailText(widget.live) != _tailText(old.live);
    if (grew) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!widget.scroll.hasClients) return;
        widget.scroll.animateTo(
          widget.scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      });
    }
  }

  static String _tailText(SparkVoiceState s) =>
      s.transcript.isEmpty ? '' : s.transcript.last.text;

  @override
  Widget build(BuildContext context) {
    final turns = widget.live.transcript;
    final showThinking = widget.thinking && !widget.live.isActive;
    final showFooter = widget.live.isActive;

    final count = widget.messages.length +
        turns.length +
        (showThinking ? 1 : 0) +
        (showFooter ? 1 : 0);

    return ListView.builder(
      controller: widget.scroll,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
      itemCount: count,
      itemBuilder: (context, i) {
        if (i < widget.messages.length) {
          return _MessageBubble(msg: widget.messages[i]);
        }
        var j = i - widget.messages.length;

        if (showThinking && j == 0) return const _ThinkingBubble();
        if (showThinking) j -= 1;

        if (j < turns.length) return _TranscriptBubble(turn: turns[j]);

        return _LiveFooter(live: widget.live);
      },
    );
  }
}

/// Always-visible footer during a live session.
///
/// This is what replaced the blank panel: even with no transcript at all, the
/// student can see that the line is open and whose turn it is.
class _LiveFooter extends StatelessWidget {
  const _LiveFooter({required this.live});
  final SparkVoiceState live;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final (String label, Color color, IconData icon) = switch (live.agentState) {
      AgentState.speaking => (
          'Spark is speaking — just cut in',
          LabSparkTokens.indigo600,
          Icons.graphic_eq_rounded,
        ),
      AgentState.thinking => (
          'Spark is thinking…',
          LabSparkTokens.amber500,
          Icons.more_horiz_rounded,
        ),
      AgentState.listening => (
          'Listening…',
          LabSparkTokens.rose600,
          Icons.mic_rounded,
        ),
      _ => live.transcript.isEmpty
          ? (
              'Line open — say hello',
              LabSparkTokens.teal600,
              Icons.record_voice_over_rounded,
            )
          : ('Your turn', LabSparkTokens.teal600, Icons.mic_none_rounded),
    };

    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 4),
      child: Center(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha: 0.30)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 7),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
              if (live.muted) ...[
                const SizedBox(width: 8),
                Icon(Icons.mic_off_rounded,
                    size: 13, color: scheme.onSurfaceVariant),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TranscriptBubble extends StatelessWidget {
  const _TranscriptBubble({required this.turn});
  final TranscriptTurn turn;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fromSpark = turn.speaker == TranscriptSpeaker.spark;
    final interrupted = turn.status == TranscriptTurnStatus.interrupted;
    final streaming = turn.status == TranscriptTurnStatus.inProgress;

    final bg = fromSpark ? scheme.surfaceContainerHigh : LabSparkTokens.teal600;
    final fg = fromSpark ? scheme.onSurface : Colors.white;

    return Container(
      alignment: fromSpark ? Alignment.centerLeft : Alignment.centerRight,
      padding: const EdgeInsets.only(bottom: 8),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.82,
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(fromSpark ? 4 : 16),
              bottomRight: Radius.circular(fromSpark ? 16 : 4),
            ),
            // A dashed-feel outline while the turn is still being recognised,
            // so a student can tell a half-heard phrase from a settled one.
            border: streaming
                ? Border.all(
                    color: fromSpark
                        ? scheme.outlineVariant
                        : Colors.white.withValues(alpha: 0.45),
                  )
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                turn.text.isEmpty ? '…' : turn.text,
                style: TextStyle(
                  color: fg,
                  fontSize: 14.5,
                  height: 1.4,
                  fontStyle: streaming ? FontStyle.italic : FontStyle.normal,
                ),
              ),
              if (interrupted) ...[
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.pan_tool_rounded,
                        size: 11,
                        color: fg.withValues(alpha: 0.7)),
                    const SizedBox(width: 4),
                    Text(
                      'you cut in',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: fg.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
