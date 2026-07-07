import { icons } from './public/js/icons.js';
import { el, $, $$, timeAgo, renderMarkdown, escapeHtml, getInitials, toast, showModal, confirmDialog, resizeImage, uid, debounce } from './public/js/utils.js';
import { store } from './public/js/store.js';
import { renderAvatar, renderPostCard, renderPostPreviewCard, renderStoryRow, renderSuggestSidebar, renderThemeSelector, renderCommentSection } from './public/js/components.js';
import { createRichTextEditor } from './public/js/editor.js';
import { renderPostPage, renderFeedPage } from './public/js/pages.js';

try {
  const dummy = document.createElement('div');
  renderPostPage(dummy, { postId: store.getState().posts[0].id });
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR: " + e.stack);
}
