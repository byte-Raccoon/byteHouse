import Foundation

public final class AppLogger: @unchecked Sendable {
    public static let shared = AppLogger()

    private let queue = DispatchQueue(label: "com.bytehouse.logger", qos: .utility)
    private var minLevel: LogLevel = .info
    private var logFileURL: URL?
    private var fileHandle: FileHandle?
    private var registeredSecrets: [String] = []

    public init() {}

    deinit {
        try? fileHandle?.close()
    }

    public func configure(minLevel: LogLevel, logPath: String, secrets: [String] = []) {
        queue.sync {
            self.minLevel = minLevel
            self.registeredSecrets = secrets.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

            let url = URL(fileURLWithPath: logPath)
            self.logFileURL = url

            let dir = url.deletingLastPathComponent()
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

            if !FileManager.default.fileExists(atPath: url.path) {
                FileManager.default.createFile(atPath: url.path, contents: nil)
            }

            try? self.fileHandle?.close()
            self.fileHandle = try? FileHandle(forWritingTo: url)
            self.fileHandle?.seekToEndOfFile()
        }
    }

    public func registerSecret(_ secret: String?) {
        guard let s = secret, !s.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        queue.async {
            if !self.registeredSecrets.contains(s) {
                self.registeredSecrets.append(s)
            }
        }
    }

    public func log(level: LogLevel, subsystem: String, message: String, metadata: [String: String]? = nil) {
        guard level >= minLevel else { return }

        let now = ISO8601DateFormatter().string(from: Date())
        let sanitizedMessage = redactSecrets(message)

        var metaStr = ""
        if let metadata = metadata, !metadata.isEmpty {
            let pairs = metadata.map { "\($0.key)=\(redactSecrets($0.value))" }.joined(separator: " ")
            metaStr = " [\(pairs)]"
        }

        let line = "\(now) [\(level.rawValue)] [\(subsystem)] \(sanitizedMessage)\(metaStr)\n"

        // Write to stdout
        print(line, terminator: "")

        // Write to file asynchronously
        queue.async { [weak self] in
            guard let self = self, let handle = self.fileHandle else { return }
            if let data = line.data(using: .utf8) {
                handle.write(data)
            }
        }
    }

    public func debug(_ subsystem: String, _ message: String, metadata: [String: String]? = nil) {
        log(level: .debug, subsystem: subsystem, message: message, metadata: metadata)
    }

    public func info(_ subsystem: String, _ message: String, metadata: [String: String]? = nil) {
        log(level: .info, subsystem: subsystem, message: message, metadata: metadata)
    }

    public func warn(_ subsystem: String, _ message: String, metadata: [String: String]? = nil) {
        log(level: .warn, subsystem: subsystem, message: message, metadata: metadata)
    }

    public func error(_ subsystem: String, _ message: String, metadata: [String: String]? = nil) {
        log(level: .error, subsystem: subsystem, message: message, metadata: metadata)
    }

    private func redactSecrets(_ text: String) -> String {
        var output = text
        for secret in registeredSecrets {
            if !secret.isEmpty && output.contains(secret) {
                output = output.replacingOccurrences(of: secret, with: "******")
            }
        }
        return output
    }
}
