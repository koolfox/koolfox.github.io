import Foundation
import Vision
import ImageIO
// Stream local source-page images to Apple's on-device OCR. Candidates need review.
while let line = readLine() {
    do {
        let input = try JSONSerialization.jsonObject(with: Data(line.utf8)) as! [String: String]
        let url = URL(fileURLWithPath: input["path"]!)
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = false
        request.minimumTextHeight = 0.005
        request.customWords = ["ReLU", "softmax", "sigmoid", "perceptron", "CNN", "RNN", "LSTM", "GRU", "BERT", "GPT", "CLIP", "ResNet", "ImageNet", "MNIST", "VQA", "CTC", "dropout"]
        try VNImageRequestHandler(url: url, options: [:]).perform([request])
        let rows: [[String: Any]] = (request.results ?? []).compactMap { observation in
            guard let text = observation.topCandidates(1).first else { return nil }
            let b = observation.boundingBox
            return ["text": text.string, "confidence": text.confidence,
                    "bbox": [b.minX, b.minY, b.width, b.height]]
        }
        let output = try JSONSerialization.data(withJSONObject: ["rows": rows])
        print(String(decoding: output, as: UTF8.self))
        fflush(stdout)
    } catch {
        print("{\"error\":\"OCR failed\"}")
        fflush(stdout)
    }
}
