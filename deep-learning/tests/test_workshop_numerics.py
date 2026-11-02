"""Independent source arithmetic and mathematical invariants for the 2026 workshops."""

import contextlib
import io
import itertools
import math
import unittest
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def execute(session, changes=None):
    code = (ROOT / f"workshops/spring-2026/{session}.py").read_text()
    for old, new in (changes or {}).items():
        if old not in code:
            raise AssertionError(f"Teaching parameter not found: {old}")
        code = code.replace(old, new, 1)
    scope = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compile(code, f"{session}.py", "exec"), scope)
    return scope


class WorkshopNumericalTests(unittest.TestCase):
    def test_source_markov_transition_mass_and_stationary_balance(self):
        result = execute("s18_markov_states")["result"]
        self.assertEqual(result["history"][1], [0.3, 0.7])
        self.assertAlmostEqual(result["history"][2][0], 0.37)
        self.assertAlmostEqual(result["stationary_distribution"][0], 4/11)
        for row in result["history"]:
            self.assertAlmostEqual(sum(row), 1)
        e, a = result["stationary_distribution"]
        self.assertAlmostEqual(0.7 * e, 0.4 * a)
        changed = execute("s18_markov_states", {"initial = [1.0, 0.0]": "initial = [0.0, 1.0]"})["result"]
        self.assertEqual(changed["history"][1], [0.4, 0.6])
        with self.assertRaises(ValueError):
            execute("s18_markov_states", {"[0.3, 0.7]": "[0.3, 0.8]"})

    def test_source_wer_exact_sentences_and_changed_prediction(self):
        result = execute("s12_word_error_rate")["result"]
        self.assertEqual(result["reference_length"], 15)
        self.assertEqual(result["minimum_edits"], 8)
        self.assertEqual(result["source_alignment_counts"], {"substitutions": 6, "insertions": 1, "deletions": 1})
        self.assertAlmostEqual(result["word_error_rate"], 8 / 15)
        identical = execute("s12_word_error_rate", {'prediction_text = "The son makes it to bike with a swarm to go outside to Denver today."': 'prediction_text = reference_text'})["result"]
        self.assertEqual(identical["minimum_edits"], 0)
        self.assertNotIn("source_alignment_counts", identical)
        with self.assertRaises(ValueError):
            execute("s12_word_error_rate", {'reference_text = "The sun makes it look like uh a warm, day to go outside to adventure."': 'reference_text = ""'})

    def test_source_caption_budget_and_beam_joint_probabilities(self):
        budget = execute("s11_caption_cost")["result"]
        self.assertEqual(budget["hours"], 8553.825)
        self.assertAlmostEqual(budget["cost_dollars"], 128307.375)
        self.assertAlmostEqual(budget["person_years"], 8553.825 / 2080)
        beam = execute("s11_beam_paths")["result"]
        self.assertEqual(beam["final_ranking"], ["AED", "ABC"])
        self.assertEqual(beam["conditional_last_token"]["AB"], 0.4)
        self.assertAlmostEqual(beam["conditional_last_token"]["ABC"], 0.8)
        with self.assertRaises(ValueError):
            execute("s11_beam_paths", {'"A": 0.5': '"A": 0.1'})
        table = execute("s11_vqa_results")["result"]
        self.assertAlmostEqual(table["proposed_minus_lstm_percentage_points"]["Other"], 6.66)
        self.assertAlmostEqual(table["question_minus_image_all_points"], 20.63)
        # Independent transcription from both source page48 and49 table renders.
        self.assertEqual(table["scores_percent"], {
            "prior_yes": [29.66,70.81,0.39,1.15],
            "image_only": [28.13,64.01,0.42,3.77],
            "question_only": [48.76,78.20,35.68,26.59],
            "lstm_question_image": [53.74,78.94,35.24,36.42],
            "deeper_question_only": [50.39,78.41,34.68,30.03],
            "deeper_question_normalized_image": [57.75,80.50,36.77,43.08]})
        self.assertAlmostEqual(table["proposed_minus_lstm_percentage_points"]["Number"], 1.53)

    def test_source_purchase_scenario_and_peak_rates(self):
        cost = execute("s09_compute_cost")["result"]
        self.assertEqual(cost["hours"], 672)
        self.assertEqual(cost["rental_cost"], 13440)
        self.assertEqual(cost["break_even_hours"], 2000)
        half_time = execute("s09_compute_cost", {"hours_per_day = 24": "hours_per_day = 12"})["result"]
        self.assertEqual(half_time["rental_cost"], 6720)
        with self.assertRaises(ValueError):
            execute("s09_compute_cost", {"hourly_rent = 20.0": "hourly_rent = 0.0"})
        rates = execute("s09_peak_throughput")["result"]
        self.assertEqual(rates["peak_operation_rate_ratios"]["TF32 Tensor"], 8)
        self.assertEqual(rates["peak_operation_rate_ratios"]["BF16 Tensor"], 16)
        self.assertEqual(rates["peak_operation_rate_ratios"]["INT8 Tensor"], 32)
        self.assertEqual(rates["integer_rate_unit"], "TOPS")
        changed = execute("s09_peak_throughput", {"fp32 = 19.5": "fp32 = 39.0"})["result"]
        self.assertEqual(changed["peak_operation_rate_ratios"]["TF32 Tensor"], 4)
        with self.assertRaises(ValueError):
            execute("s09_peak_throughput", {"fp32 = 19.5": "fp32 = 0.0"})

    def test_source_perceptron_matches_every_exact_decimal_epoch_row(self):
        result = execute("s02_majority_epochs")["result"]
        rows = [[0,0,0,0], [-0.2,0,0.2,0.2], [-0.2,0,0.4,0.2],
                [-0.4,0,0.4,0.2], [-0.4,0.2,0.4,0.4], [-0.6,0.2,0.4,0.2],
                [-0.6,0.4,0.4,0.2]]
        self.assertEqual([row["weights"] for row in result["history"]], rows)
        self.assertEqual([row["training_errors"] for row in result["history"]], [4,2,2,2,2,1,0])
        self.assertEqual(result["final_training_errors"], 0)
        doubled = execute("s02_majority_epochs", {"learning_rate = 0.1": "learning_rate = 0.2"})["result"]
        self.assertEqual(doubled["final_weights"], [-1.2,0.8,0.8,0.4])
        float_inputs = execute("s02_majority_epochs", {"[1, 0, 0]": "[1.0, 0.0, 0.0]"})["result"]
        self.assertEqual(float_inputs["final_weights"], rows[-1])
        with self.assertRaises(ValueError):
            execute("s02_majority_epochs", {"epochs = 6": "epochs = -1"})

    def test_source_truth_tables_and_binary_threshold_parameter(self):
        result = execute("s02_majority_table")["result"]
        self.assertEqual(result["targets"], [-1,1,1,1,-1,-1,1,-1])
        lower = execute("s02_majority_table", {"minimum_ones = 2": "minimum_ones = 1"})["result"]
        self.assertEqual(lower["targets"], [1,1,1,1,1,1,1,-1])
        logical = execute("s02_logic_tables")["result"]
        self.assertEqual(logical["and_outputs"], [True,False,False,False])
        self.assertEqual(logical["or_outputs"], [True,True,True,False])

    def test_original_seven_by_seven_image_and_four_filter_responses(self):
        result = execute("s05_four_filters")["result"]
        self.assertEqual(result["output_shape"], [5,5])
        self.assertEqual(result["weight_sums"], {"identity":1,"edge_detection":0,"sharpen":1,"box_blur":1})
        self.assertEqual(result["feature_maps"]["identity"], [[0,0,0,30,0]] + [[0,0,30,0,0]] * 4)
        # Source window [[0,0,30],[0,30,0],[30,0,0]] has these analytically known responses.
        for name, expected in {"identity":30,"edge_detection":-60,"sharpen":150,"box_blur":10}.items():
            self.assertEqual(result["feature_maps"][name][0][3], expected)
        brighter = execute("s05_four_filters", {"[0, 0, 0, 0, 0, 30, 0]": "[0, 0, 0, 0, 0, 60, 0]"})["result"]
        self.assertEqual(brighter["feature_maps"]["edge_detection"][0][3], -90)
        geometry = execute("s05_lenet_first_layer")["result"]
        self.assertEqual(geometry["output_shape"], [6,28,28])
        self.assertEqual((geometry["weights"], geometry["biases"], geometry["total_parameters"]), (150,6,156))

    def test_weighted_source_bpe_pairs_and_nonunique_third_merge(self):
        for index, name in enumerate(["first", "second", "third"]):
            result = execute("s13_bpe_" + name)["result"]
            self.assertEqual([row["frequency"] for row in result["rounds"]], [4,3,2])
            self.assertEqual([row["merged_symbol"] for row in result["rounds"]], ["st","me","men"])
            self.assertEqual(result["selected_round"], index)
            self.assertEqual(result["initial_alphabet_size"], 11)
            self.assertEqual(len(result["vocabulary"]), 14)
            self.assertEqual(len(result["rounds"][2]["tied_maximum_pairs"]), 5)
        # A changed dataset must not force the source's preferred merge when it is no longer maximal.
        changed = execute("s13_bpe_second", {'"cost": 2': '"cost": 10'})["result"]
        self.assertEqual(changed["rounds"][1]["selected_pair"], ["c","o"])
        self.assertEqual(changed["rounds"][1]["frequency"], 10)
        with self.assertRaises(ValueError):
            execute("s13_bpe_first", {'{"cost": 2, "best": 2, "menu": 1, "men": 1, "camel": 1}': '{}'})
        with self.assertRaises(ValueError):
            execute("s13_bpe_first", {"selected_round = 0": "selected_round = 5"})

    def test_source_sequence_rule_and_factored_label_dataset(self):
        result = execute("s07_sequence_rule")["result"]
        self.assertEqual(result["computed_sequence"], [30,15,46,23,70,35,106,53,160,80,40,20,10,5])
        self.assertTrue(result["matches_source_b"])
        self.assertEqual((result["length_a"], result["length_b"]), (8,14))
        result = execute("s07_factored_classes")["result"]
        self.assertEqual((result["flat_one_hot_width"], result["factored_two_one_hot_width"]), (9,6))
        self.assertEqual(result["possible_color_object_pairs"], 9)
        self.assertEqual(result["factored_classes"][0], {"label":"red truck", "color":[1,0,0], "object":[1,0,0]})
        with self.assertRaises(ValueError):
            execute("s07_sequence_rule", {"steps = 14": "steps = -1"})

    def test_source_language_model_ablation_tables_and_illustrated_heads(self):
        gpt = execute("s14_gpt_ablation")["result"]
        self.assertAlmostEqual(gpt["pretraining_score_difference"], 14.8)
        self.assertAlmostEqual(gpt["transformer_lstm_score_difference"], 5.6)
        self.assertAlmostEqual(gpt["auxiliary_lm_score_difference"], -0.3)
        cola = execute("s14_gpt_ablation", {'metric = "avg"': 'metric = "CoLA"'})["result"]
        self.assertAlmostEqual(cola["pretraining_score_difference"], 26.5)
        bert = execute("s14_bert_ablation")["result"]
        self.assertAlmostEqual(bert["nsp_score_differences"]["QNLI"], 3.5)
        self.assertAlmostEqual(bert["bidirectional_score_differences"]["SQuAD_F1"], 10.1)
        self.assertTrue(all(value > 0 for value in bert["nsp_score_differences"].values()))
        heads = execute("s14_bert_heads")["result"]
        self.assertEqual((heads["token_count"], heads["next_sentence_prediction"], heads["masked_word_prediction"]), (11,"isNext","city"))
        nli = execute("s14_nli_prediction")["result"]
        self.assertEqual(nli, {"prediction":"contradiction", "selected_probability":1, "class_count":3})

    def test_source_negative_polynomial_frame_starts_at_the_actual_negative_point(self):
        result = execute("s03_quadratic_negative")["result"]
        self.assertEqual(result["value"], 9)
        self.assertEqual(result["gradient"], -11)
        self.assertEqual(result["next_x"], -0.89)
        for observed, expected in zip(result["finite_differences"], [-10.96, -10.996, -10.9996]):
            self.assertAlmostEqual(observed, expected, places=8)

    def test_source_forward_and_backward_graphs_obey_the_chain_rule(self):
        addition = execute("s03_addition_graph")["result"]
        self.assertEqual(addition, {"value": 5, "grad_b": 1, "grad_c": 1})
        multiplication = execute("s03_multiply_sum_graph")["result"]
        self.assertEqual(multiplication, {"z": 5, "value": 20, "grad_z": 4, "grad_d": 5, "grad_b": 4, "grad_c": 4})
        for name in ["b", "c", "d"]:
            base = {"b": 2, "c": 3, "d": 4}
            plus, minus = dict(base), dict(base)
            plus[name] += 1e-5
            minus[name] -= 1e-5
            f = lambda values: values["d"] * (values["b"] + values["c"])
            numerical = (f(plus) - f(minus)) / 2e-5
            self.assertAlmostEqual(numerical, multiplication["grad_" + name], places=8)

    def test_original_hello_encoding_and_two_distinct_output_distributions(self):
        result = execute("s04_hello_encoding")["result"]
        self.assertEqual(result["encoded"], [[1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,1,0], [0,0,0,1]])
        self.assertEqual((result["sequence_length"], result["vocabulary_size"]), (5,4))
        self.assertEqual(execute("s04_character_choice")["result"]["prediction"], "e")
        self.assertEqual(execute("s04_character_choice_rnn")["result"]["prediction"], "h")
        with self.assertRaises(ValueError):
            execute("s04_hello_encoding", {'text = "hello"': 'text = "hello!"'})
        with self.assertRaises(ValueError):
            execute("s04_character_choice", {"[0.05, 0.65, 0.2, 0.1]": "[0.05, 0.65, 0.2, 0.2]"})

    def test_source_flattening_changes_positions_without_changing_active_pixel_count(self):
        result = execute("s05_flatten_translation")["result"]
        self.assertEqual(result["flat_original"], [1,1,0,0])
        self.assertEqual(result["flat_translated"], [0,0,1,1])
        self.assertEqual(result["changed_positions"], [0,1,2,3])
        self.assertEqual(sum(result["flat_original"]), sum(result["flat_translated"]))
        self.assertFalse(result["same_vector"])

    def test_source_pong_counts_partition_decisions_without_claiming_causality(self):
        result = execute("s18_pong_decisions")["result"]
        self.assertEqual(result["decisions_per_game"], 199)
        self.assertEqual(result["total_decisions"], 19900)
        self.assertEqual(result["winning_game_decisions"], 2388)
        self.assertEqual(result["losing_game_decisions"], 17512)
        self.assertEqual(result["winning_game_decisions"] + result["losing_game_decisions"], result["total_decisions"])
        with self.assertRaises(ValueError):
            execute("s18_pong_decisions", {"frames_per_game = 200": "frames_per_game = 1"})
        with self.assertRaises(ValueError):
            execute("s18_pong_decisions", {"wins = 12": "wins = 101"})

    def test_source_parameter_counts_and_channel_semantics(self):
        network = execute("s03_parameter_count")["result"]
        self.assertEqual(network["weights_per_layer"], [6, 9, 3])
        self.assertEqual(network["total_parameters"], 25)
        shared = execute("s05_shared_weights")["result"]
        self.assertEqual((shared["conv_weights"], shared["dense_weights"]), (4, 36))
        # Two 3-channel filters contain six 2-D slices but still only two output maps.
        channel = execute("s05_channel_count", {"filters = 1": "filters = 2"})["result"]
        self.assertEqual(channel, {"filters": 2, "kernels": 6, "feature_maps": 2, "weights_without_bias": 54})
        cost = execute("s05_rgb_compute")["result"]
        self.assertEqual(cost["total_multiplications"], 24883200)
        wider = execute("s05_rgb_compute", {"width = 1280": "width = 2560"})["result"]
        self.assertEqual(wider["total_multiplications"], 2 * cost["total_multiplications"])
        with self.assertRaises(ValueError):
            execute("s03_parameter_count", {"layer_sizes = [2, 3, 3, 1]": "layer_sizes = [2, 0, 1]"})

    def test_source_xor_four_page_defaults_and_nonlinear_intermediates(self):
        cases = [("zero_zero", [0, 0], [0, 0], 0),
                 ("zero_one", [0, 1], [1, 0], 1),
                 ("one_zero", [1, 0], [1, 0], 1),
                 ("one_one", [1, 1], [1, 1], 0)]
        for suffix, inputs, hidden, output in cases:
            result = execute("s03_xor_" + suffix)["result"]
            self.assertEqual(result["selected"]["inputs"], inputs)
            self.assertEqual(result["selected"]["hidden"], hidden)
            self.assertEqual(result["selected"]["output"], output)
            self.assertEqual(result["outputs"], [0, 1, 1, 0])
        altered = execute("s03_xor_zero_zero", {"output_bias = -0.5": "output_bias = 1.0"})
        self.assertNotEqual(altered["result"]["outputs"], [0, 1, 1, 0])
        with self.assertRaises(ValueError):
            execute("s03_xor_zero_zero", {"selected_sample = 0": "selected_sample = 4"})

    def test_source_pooling_selects_each_colored_regions_maximum(self):
        result = execute("s05_source_pooling")["result"]
        self.assertEqual(result["pooled"], [[6, 8], [3, 4]])
        self.assertEqual(result["trainable_parameters"], 0)
        overlapping = execute("s05_source_pooling", {"stride = 2": "stride = 1"})["result"]
        self.assertEqual(overlapping["shape"], [3, 3])
        self.assertEqual(overlapping["pooled"][1], [6, 7, 8])
        with self.assertRaises(ValueError):
            execute("s05_source_pooling", {"window = 2": "window = 5"})

    def test_source_roi_retains_fractional_coordinates_and_area_scaling(self):
        result = execute("s10_roi_coordinates")["result"]
        self.assertEqual(result["feature_size"], [25/4, 145/32])
        self.assertEqual(result["feature_origin_xy"], [37/4, 6])
        self.assertEqual(result["bin_size"], [25/12, 145/96])
        self.assertEqual(result["area_before"] / result["area_after"], 32**2)
        with self.assertRaises(ValueError):
            execute("s10_roi_coordinates", {"downsample = 32.0": "downsample = 0"})

    def test_source_quadratic_derivative_and_update_are_independently_correct(self):
        for x in (-1.0, 0.375, 2.0):
            scope = execute("s03_quadratic", {"x = 2.0": f"x = {x}"})
            h = 1e-5
            f = lambda value: 2 - 3 * value + 4 * value**2
            self.assertAlmostEqual(scope["gradient"], (f(x+h)-f(x-h))/(2*h), places=8)
            self.assertLessEqual(f(scope["next_x"]), f(x) + 1e-14)
        self.assertEqual(execute("s03_quadratic")["result"]["next_x"], 1.87)

    def test_source_scalar_graph_all_partial_derivatives(self):
        scope = execute("s03_scalar_graph")
        self.assertEqual(scope["gradients"], [1, 3, -2])
        self.assertAlmostEqual(scope["next_value"], -5.1406)
        f = lambda values: values[0] + values[1] * values[2]
        for index, derivative in enumerate(scope["gradients"]):
            plus, minus = [1, -2, 3], [1, -2, 3]
            plus[index] += 1e-5
            minus[index] -= 1e-5
            self.assertAlmostEqual((f(plus)-f(minus))/2e-5, derivative, places=8)

    def test_source_standardization_preserves_sign_and_uses_population_variance(self):
        result = execute("s06_standardization")["result"]
        self.assertEqual(result["means"], [17/3, 65/3])
        self.assertAlmostEqual(result["raw_sums"][1], 2.9)
        self.assertTrue(all(x < 0 for x in result["standardized"][0]))
        for j in range(2):
            self.assertAlmostEqual(sum(row[j] for row in result["standardized"]), 0)
            self.assertAlmostEqual(sum(row[j]**2 for row in result["standardized"])/3, 1)
        with self.assertRaisesRegex(ValueError, "صفر"):
            execute("s06_standardization", {"[[2.0, 10.0], [5.0, 24.0], [10.0, 31.0]]": "[[2, 10], [2, 24], [2, 31]]"})

    def test_source_majority_epoch_uses_original_order_and_tie_convention(self):
        result = execute("s02_majority_epoch")["result"]
        self.assertEqual(result["trace"][0]["prediction"], 1)
        self.assertEqual(result["trace"][0]["weights"], [-0.2, -0.2, 0, 0])
        self.assertEqual(result["trace"][1]["weights"], [0, 0, 0, 0.2])
        self.assertEqual(result["final_weights"], [-0.2, 0, 0.2, 0.2])
        self.assertEqual(result["final_errors"], 2)
        stationary = execute("s02_majority_epoch", {"learning_rate = 0.1": "learning_rate = 0"})
        self.assertEqual(stationary["weights"], [0, 0, 0, 0])

    def test_full_source_attention_projections_all_queries_and_changed_case(self):
        scope = execute("s13_source_attention")
        self.assertEqual(scope["queries"], [[1, 0, 2], [2, 2, 2], [2, 1, 3]])
        self.assertEqual(scope["keys"], [[0, 1, 1], [4, 4, 0], [2, 3, 1]])
        self.assertEqual(scope["values"], [[1, 2, 3], [2, 8, 0], [2, 6, 3]])
        self.assertEqual(scope["all_scores"], [[2, 4, 4], [4, 16, 12], [4, 12, 10]])
        for i, name in enumerate(("s13_source_attention", "s13_source_query_2", "s13_source_query_3")):
            output = execute(name)["result"]
            self.assertEqual(output["selected_query"], i)
            self.assertEqual(output["scores"], scope["all_scores"][i])
            expected_weights = [math.exp(v) / sum(math.exp(x) for x in output["scores"]) for v in output["scores"]]
            for actual, expected in zip(output["weights"], expected_weights):
                self.assertAlmostEqual(actual, expected)
            for column, actual in enumerate(output["output"]):
                self.assertAlmostEqual(actual, sum(w * row[column] for w, row in zip(expected_weights, scope["values"])))
            edited = execute(name, {"scaled = False": "scaled = True"})["result"]
            self.assertIsNone(edited["slide_approximation_output"])
        with self.assertRaises(ValueError):
            execute("s13_source_attention", {"selected_query = 0": "selected_query = 3"})
        with self.assertRaises(ValueError):
            scope["project"]([[1, 2]], [[1, 2]])

    def test_source_backprop_passes_all_eleven_central_differences(self):
        scope = execute("s03")
        parameters = scope["source_parameters"]
        forward = scope["source_forward"]
        network = scope["result"]["source_network"]
        self.assertAlmostEqual(network["forward"]["z4"], -0.7)
        self.assertAlmostEqual(network["forward"]["z5"], 0.1)
        self.assertAlmostEqual(network["forward"]["o4"], 1 / (1 + math.exp(0.7)))
        for name, analytic in network["squared_error_gradients"].items():
            with self.subTest(parameter=name):
                plus, minus = dict(parameters), dict(parameters)
                plus[name] += 1e-5
                minus[name] -= 1e-5
                numerical = (forward(plus)["squared_error"] - forward(minus)["squared_error"]) / 2e-5
                self.assertAlmostEqual(analytic, numerical, delta=2e-10)
                self.assertAlmostEqual(analytic, 2 * network["source_scaled_gradients"][name])
        # Input 2 is zero; its outgoing weights must not influence this example.
        self.assertEqual(network["squared_error_gradients"]["w24"], 0)
        self.assertEqual(network["squared_error_gradients"]["w25"], 0)
        # Source p75 drops factor 2: halving full-square LR gives the identical step.
        half_step = {k: v - 0.1 * network["source_scaled_gradients"][k] for k, v in parameters.items()}
        full_step = {k: v - 0.05 * network["squared_error_gradients"][k] for k, v in parameters.items()}
        self.assertEqual(half_step, full_step)
        self.assertLess(forward(full_step)["squared_error"], network["forward"]["squared_error"])

    def test_standalone_source_backprop_has_only_the_network_and_correct_derivatives(self):
        scope = execute("s03_backprop")
        self.assertNotIn("before", scope["result"])
        network = scope["result"]
        parameters = scope["source_parameters"]
        for name, gradient in network["squared_error_gradients"].items():
            plus, minus = dict(parameters), dict(parameters)
            plus[name] += 1e-5
            minus[name] -= 1e-5
            numerical = (scope["source_forward"](plus)["squared_error"] - scope["source_forward"](minus)["squared_error"]) / 2e-5
            self.assertAlmostEqual(gradient, numerical, delta=2e-10)
        self.assertAlmostEqual(network["forward"]["o6"], 0.47388889882398544)

    def test_standalone_source_stencil_has_source_grid_and_linear_response(self):
        scope = execute("s05_source_convolution")
        self.assertEqual(scope["result"]["feature_map"], [[4, 3, 4], [2, 4, 3], [2, 3, 4]])
        self.assertEqual(scope["result"]["bottom_right"], 4)
        doubled = [[2 * value for value in row] for row in scope["source_image"]]
        responses = scope["correlate"](doubled, scope["source_kernel"], 1)
        self.assertEqual(responses, [[2 * value for value in row] for row in scope["result"]["feature_map"]])

    def test_source_convolution_grid_and_shared_weight_count(self):
        scope = execute("s05")
        self.assertEqual(scope["result"]["source_feature_map"], [[4, 3, 4], [2, 4, 3], [2, 3, 4]])
        self.assertEqual(scope["result"]["source_weight_count"], 9)
        # A rectangular all-one filter sums each horizontal pair, with no flip.
        self.assertEqual(scope["correlate"]([[1, 2, 3], [4, 5, 6]], [[1, 1]], 1), [[3, 5], [9, 11]])
        for values, kernel, stride in [([], [[1]], 1), ([[1, 2], [3]], [[1]], 1), ([[1]], [[1, 2]], 1), ([[1]], [[1]], 0)]:
            with self.subTest(values=values, stride=stride), self.assertRaises(ValueError):
                scope["correlate"](values, kernel, stride)

    def test_transposed_convolution_is_the_adjoint_of_cross_correlation(self):
        correlate = execute("s05")["correlate"]
        transpose = execute("s10")["transposed_convolution"]
        kernel = [[1, -2, 3], [4, 0, -1]]
        for stride in (1, 2):
            probe = [[2, -1], [0, 3]]
            transposed = transpose(probe, kernel, stride)
            image = [[(r + 2) * (c - 1) for c in range(len(transposed[0]))] for r in range(len(transposed))]
            correlated = correlate(image, kernel, stride)
            left = sum(x * y for row, other in zip(correlated, probe) for x, y in zip(row, other))
            right = sum(x * y for row, other in zip(image, transposed) for x, y in zip(row, other))
            self.assertEqual(left, right)
            self.assertEqual(sum(map(sum, transposed)), sum(map(sum, probe)) * sum(map(sum, kernel)))

    def test_transpose_source_arrays_and_shape_errors(self):
        scope = execute("s10")
        self.assertEqual(scope["result"]["stride_1"], [[0, 0, 1], [0, 4, 6], [4, 12, 9]])
        self.assertEqual(scope["result"]["stride_2"], [[0, 0, 0, 1], [0, 0, 2, 3], [0, 2, 0, 3], [4, 6, 6, 9]])
        for values, kernel, stride in [([], [[1]], 1), ([[1]], [], 1), ([[1], [2, 3]], [[1]], 1), ([[1]], [[1]], True)]:
            with self.subTest(values=values, stride=stride), self.assertRaises(ValueError):
                scope["transposed_convolution"](values, kernel, stride)

    def test_quantization_error_by_exact_decimal_arithmetic(self):
        r = execute("s09")["result"]
        # Distances from original source decimals to their nearest codebook entry.
        squared_errors = [Fraction(2, 10)**2, Fraction(1, 10)**2, Fraction(1, 10)**2,
                          Fraction(1, 10)**2, 0, Fraction(7, 100)**2, Fraction(1, 10)**2, 0, 0]
        self.assertAlmostEqual(r["mean_squared_error"], float(sum(squared_errors) / 9))
        self.assertEqual(r["indices"], [1, 3, 2, 1, 0, 1, 3, 2, 1])
        self.assertEqual(r["total_quantized_bits"], 9 * 2 + 4 * 32)
        self.assertAlmostEqual(r["compression_ratio"], 288 / 146)

    def test_attention_source_logits_exact_softmax_and_convex_hull(self):
        for session, expected_scores in [("s12", [2, 0, 3, 3]), ("s13", [2, 4, 4])]:
            scope = execute(session)
            r = scope["result"]
            self.assertEqual(r["scores"], expected_scores)
            self.assertAlmostEqual(sum(r["weights"]), 1)
            for score, weight in zip(expected_scores, r["weights"]):
                self.assertAlmostEqual(weight, math.exp(score) / sum(map(math.exp, expected_scores)))
            values = scope["inputs"] if session == "s12" else scope["values"]
            output = r["context"] if session == "s12" else r["output"]
            for column, number in enumerate(output):
                self.assertGreaterEqual(number, min(row[column] for row in values))
                self.assertLessEqual(number, max(row[column] for row in values))
        # Source approximation 0,.5,.5 is explicitly separate; the exact first weight is positive.
        r = execute("s13")["result"]
        self.assertGreater(r["weights"][0], 0.06)
        self.assertEqual(r["slide_approximation_output"], [2.0, 7.0, 1.5])
        self.assertNotEqual(r["output"], r["slide_approximation_output"])
        changed = execute("s13", {"query = [1, 0, 2]": "query = [2, 0, 2]"})["result"]
        self.assertIsNone(changed["slide_approximation_output"])
        # A consistent fourth key/value is valid exact attention, with no fabricated slide approximation.
        expanded = execute("s13", {
            "keys = [[0, 1, 1], [4, 4, 0], [2, 3, 1]]": "keys = [[0, 1, 1], [4, 4, 0], [2, 3, 1], [1, 0, 0]]",
            "values = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]": "values = [[1, 2, 3], [2, 8, 0], [2, 6, 3], [0, 0, 0]]",
        })["result"]
        self.assertEqual(len(expanded["weights"]), 4)
        self.assertIsNone(expanded["slide_approximation_output"])

    def test_attention_does_not_truncate_mismatched_dimensions(self):
        scope = execute("s12")
        with self.assertRaises(ValueError):
            scope["dot"]([1, 2], [3])
        for scores in ([], [float("inf")], [float("nan")]):
            with self.assertRaises(ValueError):
                scope["softmax"](scores)
        self.assertEqual(scope["softmax"]([10000, 10000]), [0.5, 0.5])
        for old, new in [("query = [1, 0, 2]", "query = [1]"), ("values = [[1, 2, 3], [2, 8, 0], [2, 6, 3]]", "values = [[1, 2, 3]]")]:
            with self.assertRaises(ValueError):
                execute("s13", {old: new})

    def test_standardization_uses_training_statistics_and_population_variance(self):
        scope = execute("s06")
        r = scope["result"]
        for column in zip(*r["standardized_training"]):
            self.assertAlmostEqual(sum(column) / len(column), 0)
            self.assertAlmostEqual(sum(x*x for x in column) / len(column), 1)
        changed = execute("s06", {"test = [7.0, 40.0]": "test = [70.0, 400.0]"})["result"]
        self.assertEqual(r["means"], changed["means"])
        self.assertEqual(r["scales"], changed["scales"])
        with self.assertRaises(ValueError):
            execute("s06", {"training = [[1.0, 10.0], [3.0, 20.0], [5.0, 30.0]]": "training = [[1.0, 5.0], [2.0, 5.0]]"})
        with self.assertRaises(ValueError):
            scope["transform"]([1])

    def test_majority_matches_exhaustive_bernoulli_outcomes(self):
        scope = execute("s07", {"classifiers = 11": "classifiers = 3"})
        exact = sum(Fraction(1, 4)**sum(bits) * Fraction(3, 4)**(3-sum(bits))
                    for bits in itertools.product((0, 1), repeat=3) if sum(bits) >= 2)
        self.assertEqual(scope["result"]["ensemble_error"], float(exact))
        for change in ({"classifiers = 11": "classifiers = 4"}, {"individual_error = 0.25": "individual_error = 1.1"}):
            with self.assertRaises(ValueError):
                execute("s07", change)

    def test_vqa_leave_one_out_matches_source_answer_counts(self):
        r = execute("s11")["result"]
        self.assertEqual(r["scores"]["right"], 1)
        for answer in ("left", "right side", "center"):
            self.assertAlmostEqual(r["scores"][answer], 0.3)
        self.assertEqual(r["scores"]["bottom"], 0)
        with self.assertRaises(ValueError):
            execute("s11")["held_out_score"]("right", ["right"])

    def test_lora_merge_recovers_base_when_adapter_is_zero(self):
        scope = execute("s18")
        self.assertEqual(scope["result"]["base_output"], [-1, 2])
        self.assertEqual(scope["result"]["merged_output"], [3, 0])
        result = execute("s18", {"B = [[2.0], [-1.0]]": "B = [[0.0], [0.0]]"})["result"]
        self.assertEqual(result["base_output"], result["merged_output"])
        with self.assertRaises(ValueError):
            execute("s18", {"A = [[0.5, -1.0, 0.0]]": "A = [[0.5, -1.0]]"})
        with self.assertRaises(ValueError):
            scope["matvec"]([[1, 2]], [1])

    def test_moe_all_experts_equal_dense_and_temperature_preserves_ranking(self):
        base = execute("s23")["result"]
        dense = execute("s23", {"top_k = 2": "top_k = 3"})["result"]
        warm = execute("s23", {"temperature = 1.0": "temperature = 2.0"})["result"]
        self.assertEqual(dense["sparse_output"], dense["dense_output"])
        self.assertEqual(base["selected_experts"], warm["selected_experts"])
        self.assertLess(warm["probabilities"][0], base["probabilities"][0])
        self.assertLess(base["selected_probability_mass"], 1)
        self.assertAlmostEqual(base["sparse_output"] - base["dense_output"], 4 * base["probabilities"][2])
        with self.assertRaises(ValueError):
            execute("s23", {"top_k = 2": "top_k = 1.5"})

    def test_patch_pair_count_uses_all_ordered_pairs_including_self(self):
        r = execute("s14")["result"]
        self.assertEqual(r["patch_tokens"], 100)
        self.assertEqual(r["with_cls_pairs"], 10201)
        self.assertEqual(r["full_hd_pixel_pairs"], 4299816960000)
        for new in ("patch_side = 0", "patch_side = 3"):
            with self.assertRaises(ValueError):
                execute("s14", {"patch_side = 16": new})

    def test_power_law_half_loss_factors_satisfy_original_equation(self):
        scope = execute("s16")
        for name, factor in scope["result"]["factors_for_half_loss"].items():
            self.assertAlmostEqual(factor ** (-scope["exponents"][name]), 0.5)
        with self.assertRaises(ValueError):
            execute("s16", {"target_ratio = 0.5": "target_ratio = 0"})

    def test_sampling_ties_and_budget_bounds_are_explicit(self):
        tied = execute("s17", {"n_paths = 5": "n_paths = 7"})["result"]
        self.assertEqual(tied["winners"], [18, 26])
        self.assertIsNone(tied["selected_answer"])
        for new in ("n_paths = -1", "n_paths = 8"):
            with self.assertRaises(ValueError):
                execute("s17", {"n_paths = 5": new})
        radii = [execute("s26", {"budget = 2": f"budget = {n}"})["result"]["coverage_radius"] for n in (1, 2, 3)]
        self.assertEqual(radii, sorted(radii, reverse=True))
        self.assertAlmostEqual(radii[-1], 0.2)
        with self.assertRaises(ValueError):
            execute("s26", {"budget = 2": "budget = 0"})

    def test_training_and_test_error_remain_distinct(self):
        initial = execute("s01")["result"]
        changed = execute("s01", {"threshold = 0.5": "threshold = 0.7"})["result"]
        self.assertEqual(initial["training_accuracy"], 1)
        self.assertEqual(initial["test_accuracy"], 0)
        self.assertEqual(changed["training_accuracy"], 1)
        self.assertEqual(changed["test_accuracy"], 0.5)

    def test_residual_weight_follows_quadratic_gradient_descent(self):
        scope = execute("s08")
        history = scope["result"]["history"]
        factor = 1 - 2 * scope["learning_rate"] * scope["x"] ** 2
        for previous, current in zip(history, history[1:]):
            self.assertAlmostEqual(current["weight"], previous["weight"] * factor)
            self.assertAlmostEqual(current["loss"], previous["loss"] * factor ** 2)

    def test_pareto_dominance_keeps_ties_and_rejects_inferior_model(self):
        scope = execute("s31")
        b = {"name": "B", "accuracy": 0.89, "joules": 50}
        same = {"name": "copy", "accuracy": 0.89, "joules": 50}
        inferior = {"name": "D", "accuracy": 0.88, "joules": 60}
        self.assertFalse(scope["dominates"](b, same))
        self.assertTrue(scope["dominates"](b, inferior))
        self.assertEqual(scope["result"]["eligible"], ["B"])

    def test_fairness_gaps_do_not_follow_selection_parity(self):
        r = execute("s24")["result"]
        self.assertEqual(r["absolute_gaps"]["selection_rate"], 0)
        self.assertEqual(r["absolute_gaps"]["true_positive_rate"], 0.5)
        self.assertAlmostEqual(r["absolute_gaps"]["false_positive_rate"], 1/3)

    def test_parity_and_perceptron_contracts(self):
        scope = execute("s02")
        with self.assertRaises(ValueError):
            scope["predict"]([1, 2], [1], 0)
        for bits in itertools.product((0, 1), repeat=4):
            r = execute("s04", {"sequence = [1, 0, 1, 1]": f"sequence = {list(bits)}"})["result"]
            self.assertEqual(r["predicted_odd"], [sum(bits[:n]) % 2 for n in range(1, 5)])
        with self.assertRaises(ValueError):
            execute("s04", {"sequence = [1, 0, 1, 1]": "sequence = [2]"})


if __name__ == "__main__":
    unittest.main()
