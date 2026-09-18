import Foundation

public enum LogLevel: String, Codable, Sendable, Comparable {
    case debug = "DEBUG"
    case info = "INFO"
    case warn = "WARN"
    case error = "ERROR"

    private var priority: Int {
        switch self {
        case .debug: return 0
        case .info: return 1
        case .warn: return 2
        case .error: return 3
        }
    }

    public static func < (lhs: LogLevel, rhs: LogLevel) -> Bool {
        return lhs.priority < rhs.priority
    }
}

public struct AppConfig: Sendable {
    public let databasePath: String
    public let logLevel: LogLevel
    public let logPath: String
    public let aiProvider: String
    public let geminiApiKey: String?
    public let openAiApiKey: String?
    public let hotkey: String

    public init(
        databasePath: String,
        logLevel: LogLevel = .info,
        logPath: String,
        aiProvider: String = "mock",
        geminiApiKey: String? = nil,
        openAiApiKey: String? = nil,
        hotkey: String = "⌃⌥ Space"
    ) {
        self.databasePath = databasePath
        self.logLevel = logLevel
        self.logPath = logPath
        self.aiProvider = aiProvider
        self.geminiApiKey = geminiApiKey
        self.openAiApiKey = openAiApiKey
        self.hotkey = hotkey
    }

    public static func load(envPath: String? = nil) -> AppConfig {
        let fileManager = FileManager.default
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let byteHouseDir = appSupport.appendingPathComponent("ByteHouse", isDirectory: true)

        let logDir = fileManager.urls(for: .libraryDirectory, in: .userDomainMask).first!
            .appendingPathComponent("Logs", isDirectory: true)
            .appendingPathComponent("ByteHouse", isDirectory: true)

        // Parse .env if exists
        var envMap: [String: String] = [:]
        var candidatePaths: [String] = [
            fileManager.currentDirectoryPath + "/.env",
            byteHouseDir.appendingPathComponent(".env").path
        ]
        if let customPath = envPath {
            candidatePaths.insert(customPath, at: 0)
        }

        for path in candidatePaths {
            if fileManager.fileExists(atPath: path),
               let content = try? String(contentsOfFile: path, encoding: .utf8) {
                let parsed = parseEnvContent(content)
                for (k, v) in parsed {
                    if envMap[k] == nil {
                        envMap[k] = v
                    }
                }
            }
        }

        // Environment variables override .env file
        let processEnv = ProcessInfo.processInfo.environment
        func getVal(_ key: String) -> String? {
            return processEnv[key] ?? envMap[key]
        }

        let dbPath = getVal("DATABASE_PATH") ?? byteHouseDir.appendingPathComponent("bytehouse.db").path
        let logPath = getVal("LOG_PATH") ?? logDir.appendingPathComponent("bytehouse.log").path
        let rawLevel = getVal("LOG_LEVEL")?.uppercased() ?? "INFO"
        let level = LogLevel(rawValue: rawLevel) ?? .info
        let provider = getVal("AI_PROVIDER") ?? "mock"
        let geminiKey = getVal("GEMINI_API_KEY")
        let openAiKey = getVal("OPENAI_API_KEY")
        let hotkey = getVal("HOTKEY") ?? "⌃⌥ Space"

        return AppConfig(
            databasePath: dbPath,
            logLevel: level,
            logPath: logPath,
            aiProvider: provider,
            geminiApiKey: geminiKey,
            openAiApiKey: openAiKey,
            hotkey: hotkey
        )
    }

    public static func parseEnvContent(_ content: String) -> [String: String] {
        var result: [String: String] = [:]
        let lines = content.components(separatedBy: .newlines)

        for rawLine in lines {
            var line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.isEmpty || line.hasPrefix("#") {
                continue
            }
            if line.hasPrefix("export ") {
                line = String(line.dropFirst(7)).trimmingCharacters(in: .whitespaces)
            }

            guard let eqIndex = line.firstIndex(of: "=") else { continue }
            let key = String(line[..<eqIndex]).trimmingCharacters(in: .whitespaces)
            var val = String(line[line.index(after: eqIndex)...]).trimmingCharacters(in: .whitespaces)

            // Remove surrounding quotes if present
            if (val.hasPrefix("\"") && val.hasSuffix("\"")) || (val.hasPrefix("'") && val.hasSuffix("'")) {
                if val.count >= 2 {
                    val = String(val.dropFirst().dropLast())
                }
            }

            if !key.isEmpty {
                result[key] = val
            }
        }

        return result
    }
}
