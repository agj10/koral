import { icons } from './js/icons.js';
import { el, $, $$, timeAgo, renderMarkdown, escapeHtml, getInitials, toast, showModal, confirmDialog, resizeImage, uid, debounce } from './js/utils.js';
import { store } from './js/store.js';
import { renderAvatar, renderPostCard, renderPostPreviewCard, renderStoryRow, renderSuggestSidebar, renderThemeSelector, renderCommentSection } from './js/components.js';
import { createRichTextEditor } from './js/editor.js';
import { renderPostPage, renderFeedPage } from './js/pages.js';

try {
  const dummy = document.createElement('div');
  renderPostPage(dummy, { postId: store.getState().posts[0].id });
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR: " + e.stack);
}
