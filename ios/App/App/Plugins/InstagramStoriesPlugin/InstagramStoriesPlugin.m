#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(InstagramStoriesPlugin, "InstagramStories",
    CAP_PLUGIN_METHOD(shareSticker, CAPPluginReturnPromise);
)
