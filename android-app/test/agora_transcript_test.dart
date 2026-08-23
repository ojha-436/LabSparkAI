import 'package:flutter_test/flutter_test.dart';
import 'package:labspark_ai/features/spark/agora_self_speech_filter.dart';
import 'package:labspark_ai/features/spark/agora_transcript.dart';

void main() {
  group('TranscriptAssembler', () {
    late TranscriptAssembler a;
    setUp(() => a = TranscriptAssembler());

    test('streaming partials update one turn instead of appending', () {
      a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 1,
        'text': 'Sugar',
        'turn_status': 0,
      }, localUid: 42);
      final turns = a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 1,
        'text': 'Sugar dissolves in water',
        'turn_status': 1,
      }, localUid: 42)!;

      expect(turns, hasLength(1));
      expect(turns.single.text, 'Sugar dissolves in water');
      expect(turns.single.status, TranscriptTurnStatus.end);
    });

    test('separate turn ids produce separate turns', () {
      a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 1,
        'text': 'First',
      }, localUid: 42);
      final turns = a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 2,
        'text': 'Second',
      }, localUid: 42)!;
      expect(turns, hasLength(2));
    });

    test('student and agent turns with the same id do not collide', () {
      a.handlePayload({
        'object': 'user.transcription',
        'turn_id': 7,
        'text': 'why does sand not dissolve',
      }, localUid: 42);
      final turns = a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 7,
        'text': 'Because its particles are too large.',
      }, localUid: 42)!;

      expect(turns, hasLength(2));
      expect(
        turns.map((t) => t.speaker),
        containsAll([TranscriptSpeaker.student, TranscriptSpeaker.spark]),
      );
    });

    test('user turn without a final flag is treated as settled', () {
      final turns = a.handlePayload({
        'object': 'user.transcription',
        'turn_id': 3,
        'text': 'hello',
      }, localUid: 42)!;
      expect(turns.single.status, TranscriptTurnStatus.end);
      expect(turns.single.isFinal, isTrue);
    });

    test('final:false marks the turn in progress', () {
      final turns = a.handlePayload({
        'object': 'user.transcription',
        'turn_id': 3,
        'text': 'hel',
        'final': false,
      }, localUid: 42)!;
      expect(turns.single.status, TranscriptTurnStatus.inProgress);
      expect(turns.single.isFinal, isFalse);
    });

    test('turn_status 2 means the agent was interrupted', () {
      final turns = a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 4,
        'text': 'Well, the reason is',
        'turn_status': 2,
      }, localUid: 42)!;
      expect(turns.single.status, TranscriptTurnStatus.interrupted);
    });

    test('message.interrupt marks the matching agent turn', () {
      a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 5,
        'text': 'Let me explain that',
        'turn_status': 1,
      }, localUid: 42);
      final turns = a.handlePayload(
        {'object': 'message.interrupt', 'turn_id': 5},
        localUid: 42,
      )!;
      expect(turns.single.status, TranscriptTurnStatus.interrupted);
    });

    test('message.interrupt never touches a student turn', () {
      a.handlePayload({
        'object': 'user.transcription',
        'turn_id': 9,
        'text': 'stop',
      }, localUid: 42);
      final turns = a.handlePayload(
        {'object': 'message.interrupt', 'turn_id': 9},
        localUid: 42,
      )!;
      expect(turns.single.status, TranscriptTurnStatus.end);
    });

    test('a blank text update does not erase existing text', () {
      a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 6,
        'text': 'Iron is magnetic.',
        'turn_status': 0,
      }, localUid: 42);
      final turns = a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 6,
        'text': '',
        'turn_status': 1,
      }, localUid: 42)!;
      expect(turns.single.text, 'Iron is magnetic.');
      expect(turns.single.status, TranscriptTurnStatus.end);
    });

    test('run-together punctuation is spaced out', () {
      final turns = a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 8,
        'text': 'Sugar dissolves.Sand does not,really',
      }, localUid: 42)!;
      expect(turns.single.text, 'Sugar dissolves. Sand does not, really');
    });

    test('unknown payload objects are ignored', () {
      expect(
        a.handlePayload({'object': 'message.metrics'}, localUid: 42),
        isNull,
      );
    });

    test('turns are ordered oldest first', () {
      a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 2,
        'text': 'second',
        'send_ts': 2000,
      }, localUid: 42);
      final turns = a.handlePayload({
        'object': 'assistant.transcription',
        'turn_id': 1,
        'text': 'first',
        'send_ts': 1000,
      }, localUid: 42)!;
      expect(turns.first.text, 'first');
      expect(turns.last.text, 'second');
    });

    test('reset clears everything', () {
      a.handlePayload({
        'object': 'user.transcription',
        'turn_id': 1,
        'text': 'hi',
      }, localUid: 42);
      a.reset();
      expect(a.snapshot(), isEmpty);
    });
  });

  group('agentStateFrom', () {
    test('maps the engine vocabulary', () {
      expect(agentStateFrom('speaking'), AgentState.speaking);
      expect(agentStateFrom('LISTENING'), AgentState.listening);
      expect(agentStateFrom('thinking'), AgentState.thinking);
      expect(agentStateFrom('idle'), AgentState.idle);
      expect(agentStateFrom('silent'), AgentState.silent);
      expect(agentStateFrom('nonsense'), AgentState.unknown);
    });
  });

  group('SelfSpeechFilter', () {
    late SelfSpeechFilter f;
    setUp(() => f = SelfSpeechFilter());

    test('keeps everything when Spark is not speaking', () {
      expect(f.shouldDiscard('anything at all here'), isFalse);
    });

    test('discards a verbatim echo of Spark', () {
      f.updateAgentText(
          'Sugar dissolves in water because its particles are small');
      expect(f.shouldDiscard('dissolves in water because its'), isTrue);
    });

    test('discards a near-identical echo', () {
      f.updateAgentText('Iron cobalt nickel and steel are attracted magnets');
      expect(f.shouldDiscard('iron cobalt nickel and steel are attracted'),
          isTrue);
    });

    test('keeps a genuine student question during agent speech', () {
      f.updateAgentText(
          'Sugar dissolves in water because its particles are small');
      expect(f.shouldDiscard('but what about sand and oil in the beaker'),
          isFalse);
    });

    // The whole point of the feature: short cut-ins must survive, even when
    // the word also appears in what Spark is saying.
    test('protects short interrupt commands', () {
      f.updateAgentText('Please wait while I explain the next step to you');
      for (final cmd in ['stop', 'wait', 'no', 'hold on', 'why', 'slow down']) {
        expect(f.shouldDiscard(cmd), isFalse, reason: 'must not swallow "$cmd"');
      }
    });

    test('protects a command used as a sentence opener', () {
      f.updateAgentText('the reason is that particles are very small indeed');
      expect(f.shouldDiscard('wait I do not understand that part'), isFalse);
    });

    test('short utterances are never judged by similarity', () {
      f.updateAgentText('the the the the the the');
      expect(f.shouldDiscard('the the the'), isFalse);
    });

    test('clear() stops filtering', () {
      f.updateAgentText('Sugar dissolves in water because particles are small');
      expect(f.shouldDiscard('dissolves in water because particles'), isTrue);
      f.clear();
      expect(f.shouldDiscard('dissolves in water because particles'), isFalse);
    });

    test('punctuation and case are ignored when comparing', () {
      f.updateAgentText('Iron, cobalt and nickel are magnetic materials!');
      expect(f.shouldDiscard('IRON COBALT AND NICKEL ARE MAGNETIC'), isTrue);
    });

    test('decision carries a reason for logging', () {
      f.updateAgentText('sugar dissolves in water because particles are small');
      expect(f.decide('stop').reason, 'protected-interrupt-command');
      expect(f.decide('dissolves in water because particles').discard, isTrue);
    });
  });
}
