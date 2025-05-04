package __PACKAGE_NAME__

import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

import getpoi.com.poibeaconsdk.PoiAnalysis
import getpoi.com.poibeaconsdk.models.PoiAnalysisConfig
import getpoi.com.poibeaconsdk.models.PoiResponseCallback

class PoilabsAnalysisModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), PoiResponseCallback {
    private val reactContext: ReactApplicationContext = reactContext

    private var applicationId: String = ""
    private var applicationSecret: String = ""
    private var uniqueIdentifier: String = ""

    override fun getName(): String = "PoilabsAnalysisModule"

    @ReactMethod
    fun startPoilabsAnalysis(
        appId: String,
        appSecret: String,
        uniqueId: String,
        promise: Promise
    ) {
        try {
            val config = PoiAnalysisConfig(appId, appSecret, uniqueId)
            config.setEnabled(true)

            PoiAnalysis.getInstance(reactContext, config)
            PoiAnalysis.getInstance().setPoiResponseListener(this)
            PoiAnalysis.getInstance().enable()
            PoiAnalysis.getInstance().startScan(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.localizedMessage)
        }
    }

    @ReactMethod
    fun stopPoilabsAnalysis() {
        PoiAnalysis.getInstance().stopScan()
    }

    @ReactMethod
    fun configureAnalysis(options: ReadableMap, promise: Promise) {
        try {
            val poiAnalysisConfig = PoiAnalysisConfig(
                applicationId,
                applicationSecret,
                uniqueIdentifier
            )
            if (options.hasKey("enabled")) {
                poiAnalysisConfig.setEnabled(options.getBoolean("enabled"))
            }
            if (options.hasKey("openSystemBluetooth")) {
                poiAnalysisConfig.setOpenSystemBluetooth(options.getBoolean("openSystemBluetooth"))
            }
            if (options.hasKey("enableForegroundService") && options.getBoolean("enableForegroundService")) {
                poiAnalysisConfig.enableForegroundService()
            }
            options.getString("serviceNotificationTitle")?.let {
                poiAnalysisConfig.setServiceNotificationTitle(it)
            }
            if (options.hasKey("notificationChannelName") && options.hasKey("notificationChannelDescription")) {
                val channelName = options.getString("notificationChannelName") ?: ""
                val channelDesc = options.getString("notificationChannelDescription") ?: ""
                poiAnalysisConfig.setForegroundServiceNotificationChannelProperties(
                    channelName,
                    channelDesc
                )
            }
            if (options.hasKey("notificationIconResourceId")) {
                poiAnalysisConfig.setForegroundServiceNotificationIconResourceId(
                    options.getInt("notificationIconResourceId")
                )
            }

            PoiAnalysis.getInstance(reactContext.applicationContext, poiAnalysisConfig)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CONFIG_ERROR", e.message)
        }
    }

    @ReactMethod
    fun updateUniqueId(uniqueId: String, promise: Promise) {
        try {
            PoiAnalysis.getInstance().updateUniqueId(uniqueId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_UNIQUEID_ERROR", e.message)
        }
    }

    override fun onResponse(nodeIds: List<String>?) {
        nodeIds?.let {
            val params = Arguments.createMap().apply {
                putString("type", "beacon_detected")
                putString("nodeIds", it.joinToString(","))
            }
            sendEvent("PoilabsAnalysisEvent", params)
        }
    }

    override fun onFail(cause: Exception?) {
        val params = Arguments.createMap().apply {
            putString("type", "error")
            putString("message", cause?.message ?: "Unknown error")
        }
        sendEvent("PoilabsAnalysisEvent", params)
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter Calls
    }
}
