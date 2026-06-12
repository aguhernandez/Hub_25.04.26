package pro.asciende.app.plugins;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "InstagramStories")
public class InstagramStoriesPlugin extends Plugin {

    @PluginMethod
    public void shareSticker(PluginCall call) {
        String base64Image = call.getString("stickerImage");
        if (base64Image == null || base64Image.isEmpty()) {
            call.reject("Missing stickerImage parameter");
            return;
        }

        String appId = call.getString("appId", "pro.asciende.app");
        String backgroundTopColor = call.getString("backgroundTopColor", "#000000");
        String backgroundBottomColor = call.getString("backgroundBottomColor", "#000000");

        try {
            byte[] imageBytes = Base64.decode(base64Image, Base64.DEFAULT);

            File cacheDir = new File(getContext().getCacheDir(), "instagram_stories");
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }

            File stickerFile = new File(cacheDir, "sticker_" + System.currentTimeMillis() + ".png");
            FileOutputStream fos = new FileOutputStream(stickerFile);
            fos.write(imageBytes);
            fos.flush();
            fos.close();

            Uri stickerUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                stickerFile
            );

            Intent intent = new Intent("com.instagram.share.ADD_TO_STORY");
            intent.setDataAndType(stickerUri, "image/png");
            intent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.putExtra("source_application", appId);
            intent.putExtra("interactive_asset_uri", stickerUri);
            intent.putExtra("top_background_color", backgroundTopColor);
            intent.putExtra("bottom_background_color", backgroundBottomColor);

            if (getActivity().getPackageManager().resolveActivity(intent, 0) != null) {
                getActivity().startActivityForResult(intent, 0);
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Instagram is not installed");
            }
        } catch (IOException e) {
            call.reject("Failed to write sticker image: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to share to Instagram Stories: " + e.getMessage());
        }
    }
}
