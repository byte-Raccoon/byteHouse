import Foundation

public struct Conversation: Codable, Identifiable, Sendable {
    public let id: String
    public let created_at: String
    public let updated_at: String

    public init(id: String, created_at: String, updated_at: String) {
        self.id = id
        self.created_at = created_at
        self.updated_at = updated_at
    }
}

public struct Message: Codable, Identifiable, Sendable {
    public let id: String
    public let conversation_id: String
    public let role: String // "user" | "assistant" | "system" | "tool"
    public let content: String
    public let created_at: String

    public init(id: String, conversation_id: String, role: String, content: String, created_at: String) {
        self.id = id
        self.conversation_id = conversation_id
        self.role = role
        self.content = content
        self.created_at = created_at
    }
}

public struct Memory: Codable, Identifiable, Sendable {
    public let id: String
    public let content: String
    public let source: String
    public let user_confirmed: Int
    public let created_at: String

    public init(id: String, content: String, source: String, user_confirmed: Int, created_at: String) {
        self.id = id
        self.content = content
        self.source = source
        self.user_confirmed = user_confirmed
        self.created_at = created_at
    }
}

public struct TaskItem: Codable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let description: String?
    public let status: String // "pending" | "completed" | "cancelled"
    public let priority: String // "low" | "medium" | "high"
    public let due_at: String?
    public let completed_at: String?
    public let created_at: String

    public init(id: String, title: String, description: String?, status: String, priority: String, due_at: String?, completed_at: String?, created_at: String) {
        self.id = id
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.due_at = due_at
        self.completed_at = completed_at
        self.created_at = created_at
    }
}

public struct ToolTrace: Codable, Identifiable, Sendable {
    public let id: String
    public let tool_name: String
    public let input: String
    public let output: String
    public let status: String
    public let created_at: String

    public init(id: String, tool_name: String, input: String, output: String, status: String, created_at: String) {
        self.id = id
        self.tool_name = tool_name
        self.input = input
        self.output = output
        self.status = status
        self.created_at = created_at
    }
}

public struct ToolExecutionResult: Codable, Sendable {
    public let tool_name: String
    public let output: [String: AnyCodable]
    public let status: String

    public init(tool_name: String, output: [String: AnyCodable], status: String) {
        self.tool_name = tool_name
        self.output = output
        self.status = status
    }
}

public struct AnyCodable: Codable, @unchecked Sendable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            self.value = intVal
        } else if let doubleVal = try? container.decode(Double.self) {
            self.value = doubleVal
        } else if let boolVal = try? container.decode(Bool.self) {
            self.value = boolVal
        } else if let stringVal = try? container.decode(String.self) {
            self.value = stringVal
        } else if let arrayVal = try? container.decode([AnyCodable].self) {
            self.value = arrayVal.map { $0.value }
        } else if let dictVal = try? container.decode([String: AnyCodable].self) {
            self.value = dictVal.mapValues { $0.value }
        } else {
            self.value = ()
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let intVal = value as? Int {
            try container.encode(intVal)
        } else if let doubleVal = value as? Double {
            try container.encode(doubleVal)
        } else if let boolVal = value as? Bool {
            try container.encode(boolVal)
        } else if let stringVal = value as? String {
            try container.encode(stringVal)
        } else if let arrayVal = value as? [Any] {
            let codables = arrayVal.map { AnyCodable($0) }
            try container.encode(codables)
        } else if let dictVal = value as? [String: Any] {
            let codables = dictVal.mapValues { AnyCodable($0) }
            try container.encode(codables)
        }
    }
}
