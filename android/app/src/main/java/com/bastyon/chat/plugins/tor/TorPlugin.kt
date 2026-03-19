package com.bastyon.chat.plugins.tor

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Tor")
class TorPlugin : Plugin() {

    private lateinit var config: ConfigurationManager
    private lateinit var torManager: TorManager

    override fun load() {
        config = ConfigurationManager(context)
        torManager = TorManager(config)

        torManager.onBootstrapProgress = { percent ->
            notifyListeners("bootstrapProgress", JSObject().apply {
                put("progress", percent)
            })
        }

        torManager.onStateChanged = { state ->
            notifyListeners("stateChanged", JSObject().apply {
                put("state", state.name)
            })
        }
    }

    @PluginMethod
    fun startDaemon(call: PluginCall) {
        val modeStr = call.getString("mode", "always") ?: "always"
        val bridgeStr = call.getString("bridgeType", "NONE") ?: "NONE"
        val bridges = call.getArray("bridges")
            ?.toList<String>() ?: emptyList()

        val mode = when (modeStr.lowercase()) {
            "never", "neveruse" -> TorMode.NEVER
            "auto" -> TorMode.AUTO
            else -> TorMode.ALWAYS
        }
        val bridgeType = try {
            BridgeType.valueOf(bridgeStr.uppercase())
        } catch (_: Exception) {
            BridgeType.NONE
        }

        if (mode == TorMode.NEVER) {
            call.resolve(JSObject().apply {
                put("socksPort", 0)
                put("proxyPort", 0)
                put("mode", "never")
            })
            return
        }

        Thread {
            try {
                torManager.startTor(mode, bridgeType, bridges)

                val timeout = 120_000L
                val start = System.currentTimeMillis()
                while (!torManager.isReady && System.currentTimeMillis() - start < timeout) {
                    Thread.sleep(500)
                }

                if (torManager.isReady) {
                    call.resolve(JSObject().apply {
                        put("socksPort", config.torDefaultSocksPort)
                        put("proxyPort", config.reverseProxyDefaultPort)
                        put("mode", modeStr)
                    })
                } else {
                    call.reject("Tor bootstrap timeout after ${timeout / 1000}s")
                }
            } catch (e: Exception) {
                call.reject("Failed to start Tor: ${e.message}", e)
            }
        }.start()
    }

    @PluginMethod
    fun stopDaemon(call: PluginCall) {
        torManager.stopTor()
        call.resolve()
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("progress", torManager.currentBootstrap)
            put("isReady", torManager.isReady)
            put("state", torManager.currentState.name)
        })
    }

    @PluginMethod
    fun configure(call: PluginCall) {
        val modeStr = call.getString("mode") ?: "always"
        val bridgeStr = call.getString("bridgeType") ?: "NONE"
        val bridges = call.getArray("bridges")
            ?.toList<String>() ?: emptyList()

        val mode = when (modeStr.lowercase()) {
            "never", "neveruse" -> TorMode.NEVER
            "auto" -> TorMode.AUTO
            else -> TorMode.ALWAYS
        }
        val bridgeType = try {
            BridgeType.valueOf(bridgeStr.uppercase())
        } catch (_: Exception) {
            BridgeType.NONE
        }

        Thread {
            torManager.restartTor(mode, bridgeType, bridges)
            call.resolve()
        }.start()
    }
}
