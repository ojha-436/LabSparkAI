import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/theme/logo.dart';
import '../../data/models/lab.dart';
import '../spark/spark_conversation.dart';
import '../spark/spark_repository.dart';
import '../spark/spark_tts_service.dart';

/// Voice-enabled Spark chat bottom sheet.
///
/// Uses the shared [SparkTts] singleton (same voice everywhere) and the
/// persistent [sparkConversationProvider] so the student sees the full
/// history of what Spark narrated during the lab AND their own Q&A
/// carries across open/close of the sheet.
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
  bool _thinking = false;
  bool _listening = false;
  bool _sttReady = false;

  @override
  void initState() {
    super.initState();
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
    super.dispose();
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
                  hasHistory: messages.length > 1,
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
                  child: ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                    itemCount: messages.length + (_thinking ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (_thinking && i == messages.length) {
                        return const _ThinkingBubble();
                      }
                      return _MessageBubble(msg: messages[i]);
                    },
                  ),
                ),
                if (messages.length <= 1)
                  _SuggestionStrip(lab: widget.lab, onTap: _send),
                _Composer(
                  controller: _controller,
                  enabled: !_thinking,
                  listening: _listening,
                  onSend: () => _send(),
                  onMic: _toggleMic,
                  sttReady: _sttReady,
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
    required this.hasHistory,
    required this.onClose,
    required this.onClear,
  });
  final Lab lab;
  final bool thinking;
  final bool listening;
  final bool hasHistory;
  final VoidCallback onClose;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final status = listening
        ? 'listening…'
        : (thinking ? 'thinking…' : 'online · your lab guide');
    final statusColor = listening
        ? LabSparkTokens.rose600
        : (thinking ? LabSparkTokens.amber500 : LabSparkTokens.teal600);
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
          if (hasHistory)
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
