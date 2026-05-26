import Capacitor
import CapacitorPedometerPlugin

public let isCapacitorApp = true

// Force Swift package manager and linker to link the pedometer plugin
private let forcePedometerPlugin = CapacitorPedometerPlugin.self


