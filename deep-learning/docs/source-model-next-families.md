# Remaining released model families

Primary artifact metadata checked 2026-11-02. These are specific next targets,
not assertions that the unimplemented models already execute in the browser.
The full ResNet152-v1, BERT-Base MLM and ViT-B/16-224 are independently validated
in `model-execution-audit.md`.

| Priority | Released target | Pinned revision / checkpoint bytes | Required task-specific work |
| --- | --- | --- | --- |
| 1 | OpenAI CLIP ViT-B/32 | `3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268`,605,247,071-byte PyTorch checkpoint | Complete vision/text towers,77-token byte BPE, exact 224-pixel bicubic/center-crop normalization, text candidates, cosine similarity/logit scaling. Export original ZIP tensor storage as external data if exact raw ranges are verified. Source s16 pp25,40. |
| 2 | GPT-2 small 124M as an explicitly named variant | `607a30d783dfa663caf39e06633721c8d4cfcd7e`,548,105,171-byte safetensors | Full causal decoder, byte-BPE, source-compatible prompt, exact positions/masks and autoregressive decoding. Source s16 p19 introduces the 48-layer 1.5B variant; a small model must never be labeled as that largest variant. Inspect the source results table before mapping a small variant. |
| 3 | UNC LXMERT base | `628572c96242d1496147beec1c13a1bb7869605d`,1,006,130,773-byte PyTorch checkpoint | Source s14 p34 explicitly requires 36 Faster R-CNN object features from 1,600 categories, plus bounding boxes. Full end-to-end image/question inference additionally needs the matching frozen detector and its preprocessing/weights; random visual vectors are not a replacement. A precomputed-feature task must name that boundary and use actual released features. A VQA head must match its fine-tuning checkpoint. |
| 4 | Facebook wav2vec2 base960h CTC | `22aad52d435eb6dbaf354bdad9b0da84ce7d6156`,377,607,901-byte safetensors | Complete waveform CNN+Transformer+CTC head, exact 16 kHz normalization, real licensed audio and CTC decoding. Source s14 pp41–43 includes multiple pretraining/fine-tuning regimes; this 960-hour checkpoint must not claim the paper's 10-minute-data/WER result. |

Primary sources:
[CLIP publisher files](https://huggingface.co/openai/clip-vit-base-patch32/tree/3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268),
[GPT-2 published files](https://huggingface.co/openai-community/gpt2/tree/607a30d783dfa663caf39e06633721c8d4cfcd7e),
[LXMERT publisher files](https://huggingface.co/unc-nlp/lxmert-base-uncased/tree/628572c96242d1496147beec1c13a1bb7869605d),
[wav2vec2 publisher files](https://huggingface.co/facebook/wav2vec2-base-960h/tree/22aad52d435eb6dbaf354bdad9b0da84ce7d6156).
The corresponding model/config/tokenizer/license artifacts must be pinned before
implementation. Operator coverage and full original-framework output comparisons
remain empirical acceptance work for each model.

The original 175B GPT-3 checkpoint is not publicly released. Its float32 weights
alone would require 700 GB. GPT-2 is a distinct model, not a substitute carrying the
GPT-3 label. Likewise, original GPT-2's 1.5B float32 checkpoint exceeds the browser
current WebAssembly 4 GiB address-space budget before activations; any reduced precision or
streamed alternative would be a separately declared and independently validated
conversion, not an unannounced replacement.
