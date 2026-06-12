package pro.asciende.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import pro.asciende.app.plugins.InstagramStoriesPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(InstagramStoriesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
