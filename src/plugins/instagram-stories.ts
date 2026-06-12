import { registerPlugin } from '@capacitor/core';

export interface InstagramStoriesPlugin {
  shareSticker(options: {
    stickerImage: string;
    appId?: string;
    backgroundTopColor?: string;
    backgroundBottomColor?: string;
  }): Promise<{ success: boolean }>;
}

const InstagramStories = registerPlugin<InstagramStoriesPlugin>('InstagramStories');

export default InstagramStories;
