// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ByteHouse",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "ByteHouse", targets: ["ByteHouse"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "ByteHouse",
            dependencies: [],
            path: "Sources/ByteHouse",
            linkerSettings: [
                .linkedLibrary("sqlite3")
            ]
        ),
        .testTarget(
            name: "ByteHouseTests",
            dependencies: ["ByteHouse"],
            path: "Tests/ByteHouseTests"
        )
    ]
)
