package pro.asciende.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BackgroundLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "backgroundLocation",
            strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }
        )
    }
)
public class BackgroundLocationPlugin extends Plugin implements LocationForegroundService.LocationUpdateListener {

    private static final String TAG = "BackgroundLocationPlugin";
    private boolean isTracking = false;

    @PluginMethod
    public void startBackgroundLocation(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            requestAllPermissions(call, "onLocationPermissionResult");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("backgroundLocation", call, "onBackgroundPermissionResult");
            return;
        }

        doStartService(call);
    }

    @PermissionCallback
    private void onLocationPermissionResult(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("Location permission denied");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("backgroundLocation", call, "onBackgroundPermissionResult");
            return;
        }

        doStartService(call);
    }

    @PermissionCallback
    private void onBackgroundPermissionResult(PluginCall call) {
        doStartService(call);
    }

    private void doStartService(PluginCall call) {
        try {
            LocationForegroundService.setLocationListener(this);

            Intent serviceIntent = new Intent(getContext(), LocationForegroundService.class);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }

            isTracking = true;

            JSObject result = new JSObject();
            result.put("status", "started");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service", e);
            call.reject("Failed to start GPS tracking: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopBackgroundLocation(PluginCall call) {
        try {
            LocationForegroundService.setLocationListener(null);

            Intent serviceIntent = new Intent(getContext(), LocationForegroundService.class);
            serviceIntent.setAction("STOP");
            getContext().startService(serviceIntent);

            isTracking = false;

            JSObject result = new JSObject();
            result.put("status", "stopped");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop foreground service", e);
            call.reject("Failed to stop GPS tracking: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isTracking(PluginCall call) {
        JSObject result = new JSObject();
        result.put("tracking", isTracking);
        call.resolve(result);
    }

    @Override
    public void onLocationUpdate(Location location) {
        if (!isTracking) return;

        JSObject data = new JSObject();
        data.put("latitude", location.getLatitude());
        data.put("longitude", location.getLongitude());
        data.put("altitude", location.getAltitude());
        data.put("accuracy", location.getAccuracy());
        data.put("speed", location.getSpeed());
        data.put("heading", location.getBearing());
        data.put("timestamp", location.getTime());

        notifyListeners("backgroundLocationUpdate", data);
    }
}
