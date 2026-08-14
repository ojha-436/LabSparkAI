import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/theme/logo.dart';
import 'spark_repository.dart';

/// Simple chat interface with Spark. Text-only in Phase 2; live-voice + STT
/// arrive in Phase 5.
class AskSparkScreen extends ConsumerStatefulWidget {
  const AskSparkScreen({super.key});

  @override
  ConsumerState<AskSparkScreen> createState() => _AskSparkScreenState();
}

class _AskSparkScreenState extends ConsumerState<AskSparkScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();
  final List<_Msg> _messages = [];
  bool _thinking = false;

  static const _suggestions = [
    'Why does litmus paper change colour?',
    'Explain series vs parallel circuits',
    'What is friction?',
    'How does a magnet work?',
  ];

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _send([String? forced]) async {
    final text = (forced ?? _controller.text).trim();
    if (text.isEmpty || _thinking) return;

    HapticFeedback.selectionClick();
    setState(() {
      _messages.add(_Msg(text: text, fromSpark: false));
      _thinking = true;
      _controller.clear();
    });
    _scrollToBottom();

    final answer = await ref.read(sparkRepositoryProvider).ask(question: text);

    if (!mounted) return;
    setState(() {
      _messages.add(_Msg(text: answer, fromSpark: true));
      _thinking = false;
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent + 100,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Row(
          children: [
            const LabSparkLogoTile(size: 34),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Ask Spark',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                    )),
                Text(_thinking ? 'thinking…' : 'online',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: _thinking
                          ? LabSparkTokens.amber500
                          : LabSparkTokens.teal600,
                      fontWeight: FontWeight.w700,
                    )),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? _EmptyState(onSuggestionTap: _send)
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                    itemCount: _messages.length + (_thinking ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (_thinking && i == _messages.length) {
                        return const _ThinkingBubble();
                      }
                      return _MessageBubble(msg: _messages[i]);
                    },
                  ),
          ),
          _Composer(
            controller: _controller,
            focus: _focus,
            enabled: !_thinking,
            onSend: () => _send(),
          ),
        ],
      ),
    );
  }
}

class _Msg {
  const _Msg({required this.text, required this.fromSpark});
  final String text;
  final bool fromSpark;
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.msg});
  final _Msg msg;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final align = msg.fromSpark ? Alignment.centerLeft : Alignment.centerRight;
    final bg = msg.fromSpark
        ? scheme.surfaceContainerHigh
        : LabSparkTokens.teal600;
    final fg = msg.fromSpark ? scheme.onSurface : Colors.white;
    final radius = msg.fromSpark
        ? const BorderRadius.only(
            topLeft: Radius.circular(4),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(16),
            bottomRight: Radius.circular(16),
          )
        : const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(4),
            bottomLeft: Radius.circular(16),
            bottomRight: Radius.circular(16),
          );
    return Container(
      alignment: align,
      padding: const EdgeInsets.only(bottom: 10),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(color: bg, borderRadius: radius),
          child: Text(
            msg.text,
            style: TextStyle(color: fg, fontSize: 14.5, height: 1.4),
          ),
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
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            return Padding(
              padding: EdgeInsets.only(right: i < 2 ? 6 : 0),
              child: _Dot(delayMs: i * 180),
            );
          }),
        ),
      ),
    );
  }
}

class _Dot extends StatefulWidget {
  const _Dot({required this.delayMs});
  final int delayMs;
  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late final AnimationController _ctl;

  @override
  void initState() {
    super.initState();
    _ctl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    Future.delayed(Duration(milliseconds: widget.delayMs), () {
      if (mounted) _ctl.repeat(reverse: true);
    });
  }

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.25, end: 1.0).animate(_ctl),
      child: Container(
        width: 7, height: 7,
        decoration: const BoxDecoration(
          color: LabSparkTokens.teal600,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onSuggestionTap});
  final ValueChanged<String> onSuggestionTap;

  static const _suggestions = _AskSparkScreenState._suggestions;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
      children: [
        const Center(child: LabSparkLogoTile(size: 76)),
        const SizedBox(height: 20),
        const Center(
          child: Text(
            'Hi, I\'m Spark 👋',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(height: 6),
        Center(
          child: Text(
            'Your AI lab partner. Ask me anything.',
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
        ),
        const SizedBox(height: 28),
        Text('TRY ASKING',
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              fontSize: 11,
              letterSpacing: 1.6,
            )),
        const SizedBox(height: 10),
        for (final s in _suggestions)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Material(
              color: scheme.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                onTap: () {
                  HapticFeedback.selectionClick();
                  onSuggestionTap(s);
                },
                borderRadius: BorderRadius.circular(14),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      const Icon(Icons.auto_awesome_rounded,
                          size: 18, color: LabSparkTokens.teal600),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(s,
                            style:
                                const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.focus,
    required this.enabled,
    required this.onSend,
  });
  final TextEditingController controller;
  final FocusNode focus;
  final bool enabled;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        decoration: BoxDecoration(
          color: scheme.surface,
          border: Border(top: BorderSide(color: scheme.outlineVariant)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                focusNode: focus,
                enabled: enabled,
                maxLines: 4,
                minLines: 1,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
                decoration: InputDecoration(
                  hintText: 'Ask Spark anything…',
                  filled: true,
                  fillColor: scheme.surfaceContainerHigh,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
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
                  width: 46,
                  height: 46,
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
