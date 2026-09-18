import Foundation

public final class GeminiAIProvider: AIProvider, @unchecked Sendable {
    public let name = "gemini"
    private let apiKey: String
    private let model: String
    private let session: URLSession

    public init(apiKey: String, model: String = "gemini-3.6-flash", session: URLSession = .shared) {
        self.apiKey = apiKey
        self.model = model
        self.session = session
    }

    private func buildRequest(messages: [AIMessage], tools: [ToolDefinition]?, stream: Bool) throws -> URLRequest {
        let action = stream ? "streamGenerateContent?alt=sse&" : "generateContent?"
        let endpoint = "https://generativelanguage.googleapis.com/v1beta/models/\(model):\(action)key=\(apiKey)"
        guard let url = URL(string: endpoint) else {
            throw NSError(domain: "ByteHouse.Gemini", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid Gemini endpoint URL."])
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60.0

        // Build contents array
        var contents: [[String: Any]] = []

        // Extract system messages if any
        var systemInstruction: [String: Any]? = nil
        let systemMsgs = messages.filter { $0.role == "system" }
        if !systemMsgs.isEmpty {
            let combined = systemMsgs.map { $0.content }.joined(separator: "\n\n")
            systemInstruction = [
                "parts": [["text": combined]]
            ]
        }

        for msg in messages where msg.role != "system" {
            switch msg.role {
            case "user":
                contents.append([
                    "role": "user",
                    "parts": [["text": msg.content]]
                ])

            case "assistant":
                var parts: [[String: Any]] = []
                if !msg.content.isEmpty {
                    parts.append(["text": msg.content])
                }
                if let toolCalls = msg.tool_calls {
                    for call in toolCalls {
                        parts.append([
                            "functionCall": [
                                "name": call.name,
                                "args": call.arguments.mapValues { $0.value }
                            ]
                        ])
                    }
                }
                if parts.isEmpty {
                    parts.append(["text": ""])
                }
                contents.append([
                    "role": "model",
                    "parts": parts
                ])

            case "tool":
                let toolName = msg.name ?? "tool"
                var responseObj: [String: Any] = ["output": msg.content]
                if let data = msg.content.data(using: .utf8),
                   let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    responseObj = parsed
                }

                contents.append([
                    "role": "function",
                    "parts": [
                        [
                            "functionResponse": [
                                "name": toolName,
                                "response": [
                                    "name": toolName,
                                    "content": responseObj
                                ]
                            ]
                        ]
                    ]
                ])

            default:
                contents.append([
                    "role": "user",
                    "parts": [["text": msg.content]]
                ])
            }
        }

        var payload: [String: Any] = [
            "contents": contents
        ]

        if let sys = systemInstruction {
            payload["systemInstruction"] = sys
        }

        // Build tools declaration
        if let tools = tools, !tools.isEmpty {
            let functionDecls = tools.map { tool -> [String: Any] in
                var properties: [String: Any] = [:]
                var requiredProps: [String] = []

                for (pName, param) in tool.parameters {
                    var pDict: [String: Any] = [
                        "type": param.type.uppercased(),
                        "description": param.description
                    ]
                    if let enums = param.enumValues {
                        pDict["enum"] = enums
                    }
                    properties[pName] = pDict
                    if param.required {
                        requiredProps.append(pName)
                    }
                }

                let decl: [String: Any] = [
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": [
                        "type": "OBJECT",
                        "properties": properties,
                        "required": requiredProps
                    ]
                ]
                return decl
            }

            payload["tools"] = [
                ["functionDeclarations": functionDecls]
            ]
        }

        let bodyData = try JSONSerialization.data(withJSONObject: payload)
        request.httpBody = bodyData
        return request
    }

    public func generate(messages: [AIMessage], tools: [ToolDefinition]?) async throws -> AIGenerateResponse {
        let request = try buildRequest(messages: messages, tools: tools, stream: false)
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "ByteHouse.Gemini", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid network response."])
        }

        if httpResponse.statusCode != 200 {
            var errorDetail = "HTTP \(httpResponse.statusCode)"
            if let errJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errObj = errJson["error"] as? [String: Any],
               let message = errObj["message"] as? String {
                errorDetail = message
            }
            AppLogger.shared.error("Gemini", "Gemini API request failed: \(errorDetail)")
            throw NSError(domain: "ByteHouse.Gemini", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Gemini API Error (\(httpResponse.statusCode)): \(errorDetail)"])
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candidates = json["candidates"] as? [[String: Any]],
              let firstCandidate = candidates.first,
              let content = firstCandidate["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]] else {
            throw NSError(domain: "ByteHouse.Gemini", code: 502, userInfo: [NSLocalizedDescriptionKey: "Malformed response payload from Gemini API."])
        }

        var textContent = ""
        var toolCalls: [AIToolCall] = []

        for part in parts {
            if let text = part["text"] as? String {
                textContent += text
            }
            if let functionCall = part["functionCall"] as? [String: Any],
               let fName = functionCall["name"] as? String {
                let rawArgs = (functionCall["args"] as? [String: Any]) ?? [:]
                let anyCodableArgs = rawArgs.mapValues { AnyCodable($0) }
                toolCalls.append(AIToolCall(id: UUID().uuidString, name: fName, arguments: anyCodableArgs))
            }
        }

        return AIGenerateResponse(
            content: textContent.trimmingCharacters(in: .whitespacesAndNewlines),
            tool_calls: toolCalls.isEmpty ? nil : toolCalls
        )
    }

    public func generateStream(
        messages: [AIMessage],
        tools: [ToolDefinition]?,
        onDelta: @Sendable @escaping (String) -> Void
    ) async throws -> AIGenerateResponse {
        let request = try buildRequest(messages: messages, tools: tools, stream: true)
        let (asyncBytes, response) = try await session.bytes(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "ByteHouse.Gemini", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid network response from Gemini."])
        }

        if httpResponse.statusCode != 200 {
            var errData = Data()
            for try await byte in asyncBytes {
                errData.append(byte)
            }
            var errorDetail = "HTTP \(httpResponse.statusCode)"
            if let errJson = try? JSONSerialization.jsonObject(with: errData) as? [String: Any],
               let errObj = errJson["error"] as? [String: Any],
               let message = errObj["message"] as? String {
                errorDetail = message
            }
            AppLogger.shared.error("Gemini", "Gemini stream request failed: \(errorDetail)")
            throw NSError(domain: "ByteHouse.Gemini", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Gemini API Error (\(httpResponse.statusCode)): \(errorDetail)"])
        }

        var fullContent = ""
        var toolCalls: [AIToolCall] = []

        for try await line in asyncBytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty || trimmed.hasPrefix(":") { continue }
            guard trimmed.hasPrefix("data: ") else { continue }

            let jsonString = String(trimmed.dropFirst(6))
            guard let jsonData = jsonString.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let candidates = json["candidates"] as? [[String: Any]],
                  let firstCandidate = candidates.first,
                  let content = firstCandidate["content"] as? [String: Any],
                  let parts = content["parts"] as? [[String: Any]] else {
                continue
            }

            for part in parts {
                if let text = part["text"] as? String, !text.isEmpty {
                    fullContent += text
                    onDelta(text)
                }
                if let functionCall = part["functionCall"] as? [String: Any],
                   let fName = functionCall["name"] as? String {
                    let rawArgs = (functionCall["args"] as? [String: Any]) ?? [:]
                    let anyCodableArgs = rawArgs.mapValues { AnyCodable($0) }
                    toolCalls.append(AIToolCall(id: UUID().uuidString, name: fName, arguments: anyCodableArgs))
                }
            }
        }

        return AIGenerateResponse(
            content: fullContent.trimmingCharacters(in: .whitespacesAndNewlines),
            tool_calls: toolCalls.isEmpty ? nil : toolCalls
        )
    }
}
