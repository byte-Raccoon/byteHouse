import Foundation

public final class OpenAIProvider: AIProvider, @unchecked Sendable {
    public let name = "openai"
    private let apiKey: String
    private let model: String
    private let baseURL: String
    private let session: URLSession

    public init(
        apiKey: String,
        model: String = "gpt-4o-mini",
        baseURL: String = "https://api.openai.com/v1",
        session: URLSession = .shared
    ) {
        self.apiKey = apiKey
        self.model = model
        self.baseURL = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        self.session = session
    }

    public func generate(messages: [AIMessage], tools: [ToolDefinition]?) async throws -> AIGenerateResponse {
        let endpoint = "\(baseURL)/chat/completions"
        guard let url = URL(string: endpoint) else {
            throw NSError(domain: "ByteHouse.OpenAI", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid OpenAI endpoint URL: \(endpoint)"])
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30.0

        var formattedMessages: [[String: Any]] = []

        for msg in messages {
            var mDict: [String: Any] = [
                "role": msg.role,
                "content": msg.content
            ]

            if let toolCalls = msg.tool_calls, !toolCalls.isEmpty {
                let callsArray = toolCalls.map { call -> [String: Any] in
                    let argsJson = (try? JSONSerialization.data(withJSONObject: call.arguments.mapValues { $0.value })).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
                    return [
                        "id": call.id,
                        "type": "function",
                        "function": [
                            "name": call.name,
                            "arguments": argsJson
                        ]
                    ]
                }
                mDict["tool_calls"] = callsArray
            }

            if msg.role == "tool" {
                mDict["tool_call_id"] = msg.name ?? "call_default"
            }

            formattedMessages.append(mDict)
        }

        var payload: [String: Any] = [
            "model": model,
            "messages": formattedMessages
        ]

        if let tools = tools, !tools.isEmpty {
            let toolsList = tools.map { tool -> [String: Any] in
                var properties: [String: Any] = [:]
                var requiredProps: [String] = []

                for (pName, param) in tool.parameters {
                    var pDict: [String: Any] = [
                        "type": param.type.lowercased(),
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

                return [
                    "type": "function",
                    "function": [
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": [
                            "type": "object",
                            "properties": properties,
                            "required": requiredProps
                        ]
                    ]
                ]
            }
            payload["tools"] = toolsList
        }

        let bodyData = try JSONSerialization.data(withJSONObject: payload)
        request.httpBody = bodyData

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "ByteHouse.OpenAI", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid network response from OpenAI."])
        }

        if httpResponse.statusCode != 200 {
            var errorDetail = "HTTP \(httpResponse.statusCode)"
            if let errJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errObj = errJson["error"] as? [String: Any],
               let message = errObj["message"] as? String {
                errorDetail = message
            }
            AppLogger.shared.error("OpenAI", "OpenAI API request failed: \(errorDetail)")
            throw NSError(domain: "ByteHouse.OpenAI", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "OpenAI API Error (\(httpResponse.statusCode)): \(errorDetail)"])
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any] else {
            throw NSError(domain: "ByteHouse.OpenAI", code: 502, userInfo: [NSLocalizedDescriptionKey: "Malformed response payload from OpenAI API."])
        }

        let content = (message["content"] as? String) ?? ""
        var parsedCalls: [AIToolCall] = []

        if let rawCalls = message["tool_calls"] as? [[String: Any]] {
            for item in rawCalls {
                guard let fObj = item["function"] as? [String: Any],
                      let fName = fObj["name"] as? String else { continue }
                let callId = (item["id"] as? String) ?? UUID().uuidString
                var argMap: [String: AnyCodable] = [:]

                if let argsString = fObj["arguments"] as? String,
                   let argsData = argsString.data(using: .utf8),
                   let dict = try? JSONSerialization.jsonObject(with: argsData) as? [String: Any] {
                    argMap = dict.mapValues { AnyCodable($0) }
                }

                parsedCalls.append(AIToolCall(id: callId, name: fName, arguments: argMap))
            }
        }

        return AIGenerateResponse(
            content: content.trimmingCharacters(in: .whitespacesAndNewlines),
            tool_calls: parsedCalls.isEmpty ? nil : parsedCalls
        )
    }
}
