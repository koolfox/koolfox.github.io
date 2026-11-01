"""Independent equations and information-flow checks for multimodal examples."""
import importlib.util
import json
import math
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('multimodal_lab', Path(__file__).resolve().parents[1] / 'python' / 'multimodal_lab.py')
LAB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAB)


class MultimodalNumerics(unittest.TestCase):
    def test_softmax_hand_value_and_translation_invariance(self):
        self.assertAlmostEqual(LAB.softmax([0,math.log(3)])[0],.25,places=14)
        p=LAB.softmax([1,2,-3]); q=LAB.softmax([11,12,7])
        for a,b in zip(p,q): self.assertAlmostEqual(a,b,places=14)
        self.assertAlmostEqual(sum(p),1,places=14)

    def test_causal_excludes_target_and_future(self):
        base=LAB.token_prediction('causal',0)
        for right in range(4):
            r=LAB.token_prediction('causal',right)
            self.assertEqual(r['probabilities'],base['probabilities'])
            self.assertEqual(r['attention'],[1,0,0])
            self.assertEqual(r['inputs'][1],[0,0])
            self.assertEqual(r['context'],[1,0])
        expected=[math.e,1,math.exp(-1),1]
        expected=[v/sum(expected) for v in expected]
        for a,b in zip(base['probabilities'],expected): self.assertAlmostEqual(a,b,places=14)

    def test_masked_context_and_readout_equations(self):
        r=LAB.token_prediction('masked',1)
        raw=[math.exp(.5/math.sqrt(2)),1,math.exp(1/math.sqrt(2))]
        alpha=[x/sum(raw) for x in raw]
        for a,b in zip(r['attention'],alpha): self.assertAlmostEqual(a,b,places=14)
        self.assertEqual(r['inputs'][1],[0,0])
        self.assertAlmostEqual(r['context'][0],alpha[0],places=14)
        self.assertAlmostEqual(r['context'][1],alpha[2],places=14)
        self.assertNotEqual(r['probabilities'],LAB.token_prediction('masked',2)['probabilities'])
        self.assertAlmostEqual(r['nll'],-math.log(r['probabilities'][1]),places=14)

    def test_caption_recurrence_and_sequence_probability(self):
        r=LAB.caption_step(5,0,1)
        state=math.tanh(.7)
        logits=[.8+.8*state,.8-.8*state,-2+.3*state,-2-.3*state,-2]
        exps=[math.exp(x) for x in logits]
        self.assertAlmostEqual(r['state'],state,places=14)
        for a,b in zip(r['probabilities'],[x/sum(exps) for x in exps]): self.assertAlmostEqual(a,b,places=14)
        score=LAB.score_caption([0,2,4],1)
        p=score['target_probabilities']
        self.assertAlmostEqual(score['sequence_probability'],p[0]*p[1]*p[2],places=14)
        self.assertAlmostEqual(score['nll_sum'],-math.log(p[0]*p[1]*p[2]),places=14)
        self.assertAlmostEqual(score['nll_mean'],score['nll_sum']/3,places=14)

    def test_teacher_forcing_and_generation_diverge_with_negative_image(self):
        r=LAB.run_experiment('caption-sequence',image_signal=-2)
        teacher=r['tables'][0]['rows']; generated=r['tables'][1]['rows']
        self.assertEqual(teacher[1][1],'گربه')
        self.assertEqual(generated[1][1],'پرنده')
        self.assertNotEqual(teacher[1][3],generated[1][3])
        truncated=LAB.run_experiment('caption-sequence',max_steps=1)
        self.assertEqual(truncated['metrics']['رسیدن به EOS'],0)
        self.assertEqual(len(truncated['tables'][1]['rows']),1)

    def test_question_and_image_have_distinct_effects(self):
        color=LAB.question_prediction('color',0)
        swapped=LAB.question_prediction('color',1)
        place=LAB.question_prediction('location',0)
        swapped_place=LAB.question_prediction('location',1)
        self.assertAlmostEqual(color['probabilities'][0],swapped['probabilities'][1],places=14)
        self.assertEqual(place['probabilities'],swapped_place['probabilities'])
        self.assertEqual(color['target'],0); self.assertEqual(swapped['target'],1); self.assertEqual(place['target'],2)
        self.assertGreater(color['probabilities'][0],color['probabilities'][1])
        self.assertGreater(place['probabilities'][2],place['probabilities'][0])
        alpha=math.exp(2)/(math.exp(2)+1)
        self.assertAlmostEqual(color['context'][0],alpha,places=14)
        for r in [color,swapped,place]: self.assertAlmostEqual(sum(r['probabilities']),1,places=14)

    def test_history_changes_ranking_and_probability(self):
        with_h=LAB.run_experiment('visual-dialog',include_history=True,history_choice=1)
        no_h=LAB.run_experiment('visual-dialog',include_history=False,history_choice=1)
        self.assertEqual(with_h['metrics']['رتبهٔ پاسخ مرجع'],1)
        self.assertEqual(no_h['metrics']['رتبهٔ پاسخ مرجع'],2)
        self.assertGreater(with_h['metrics']['احتمالِ پاسخ مرجع'],no_h['metrics']['احتمالِ پاسخ مرجع'])
        # With no history, the model cannot depend on which hidden referent is correct.
        other=LAB.run_experiment('visual-dialog',include_history=False,history_choice=0)
        self.assertEqual(no_h['tables'][1],other['tables'][1])
        self.assertEqual([r[2:4] for r in no_h['tables'][2]['rows']],[r[2:4] for r in other['tables'][2]['rows']])

    def test_ranking_equations_and_linear_gain(self):
        r=LAB.ranking_metrics([.1,.9,.2],0,[1,0,.5])
        self.assertEqual(r['order'],[1,2,0]); self.assertEqual(r['rank'],3)
        self.assertAlmostEqual(r['reciprocal_rank'],1/3)
        expected=(.5/math.log2(3)+1/math.log2(4))/(1+.5/math.log2(3))
        self.assertAlmostEqual(r['ndcg'],expected,places=14)
        truncated=(.5/math.log2(3))/(1+.5/math.log2(3))
        self.assertAlmostEqual(r['ndcg_visdial'],truncated,places=14)
        self.assertEqual(r['ndcg_visdial_cutoff'],2)
        self.assertLess(r['ndcg_visdial'],r['ndcg'])
        self.assertEqual(r['recall_at_1'],0); self.assertEqual(r['recall_at_3'],1)
        self.assertEqual(LAB.ranking_metrics([2,1],0,[1,.5])['ndcg'],1)

    def test_json_determinism_presets_and_input_validation(self):
        before=json.dumps(LAB.PRESETS,sort_keys=True)
        for name in LAB.PRESETS:
            a=LAB.run_experiment(name); b=LAB.run_experiment(name)
            self.assertEqual(a,b); json.dumps(a,allow_nan=False)
            for value in a['metrics'].values(): self.assertTrue(math.isfinite(value))
        self.assertEqual(before,json.dumps(LAB.PRESETS,sort_keys=True))
        bad=[('token-objectives',{'right_token':True}),('token-objectives',{'objective':'none'}),('token-objectives',{'right_token':4}),('caption-sequence',{'image_signal':float('nan')}),('caption-sequence',{'temperature':0}),('caption-sequence',{'max_steps':9}),('visual-question',{'image_variant':-1}),('visual-question',{'question':None}),('visual-dialog',{'include_history':1}),('visual-dialog',{'history_choice':False}),('visual-dialog',{'surprise':0})]
        for name,params in bad:
            with self.subTest(name=name,params=params),self.assertRaises(ValueError): LAB.run_experiment(name,**params)
        for scores in [[],[float('inf')],[True],list(range(101))]:
            with self.assertRaises(ValueError): LAB.softmax(scores)
        with self.assertRaises(ValueError): LAB.score_caption([4,0])
        with self.assertRaises(ValueError): LAB.ranking_metrics([1,2],0,[0,0])
        with self.assertRaises(ValueError): LAB.ranking_metrics([1,2],0,[1])


if __name__=='__main__': unittest.main()
