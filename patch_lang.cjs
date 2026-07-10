const fs = require('fs');

let lang = fs.readFileSync('public/js/lang.js', 'utf8');

const newTranslations = {
  ko: {
    restWalk: '쉼터 산책', coastTour: '연안 관광', underwaterExplore: '수중 탐사',
    titlePlaceholder: '제목을 입력하세요', changeProfilePhoto: '프로필 사진 변경', 
    imageProcessFail: '이미지 처리에 실패했습니다.', removeProfilePhoto: '프로필 제거',
    draftSaved: '임시저장 되었습니다.', profileUpdated: '프로필이 업데이트되었습니다.',
    copyLink: '링크 복사', shareComingSoon: '공유 기능 준비중', commentAdded: '댓글이 작성되었습니다',
    uploadImageRequired: '이미지를 업로드해주세요', enterContent: '내용을 입력하세요',
    uploadImageFailed: '이미지 업로드 실패', finish: '완료', saveDraft: '임시저장',
    imageRequired: '이미지를 필수로 업로드해야 합니다.', shellCreated: '셸이 완성되었습니다.',
    suggestionsForYou: '회원님을 위한 추천', seeAll: '모두 보기', switchAccount: '계정 전환',
    following: '팔로잉', follow: '팔로우', options: '옵션', addExistingAccount: '기존 계정 추가',
    footerLinks: '소개 · 도움말 · 홍보 센터 · API · 채용 정보 · 개인정보처리방침 · 약관 · 위치 · 언어 · Meta Verified',
    searchPlaceholder: '검색', noSearchResults: '검색 결과가 없습니다.', noComments: '아직 댓글이 없습니다.',
    firstComment: '가장 먼저 댓글을 남겨보세요.', leaveReply: '답글 남기기...', replyBtnText: '답글',
    replyAdded: '답글이 작성되었습니다', editComplete: '수정 완료', viewMoreReplies: '더 많은 답글 보기',
    hideReplies: '답글 숨기기', feedError: '오류가 발생했습니다:', postError: '오류가 발생했습니다:'
  },
  en: {
    restWalk: 'Rest Walk', coastTour: 'Coast Tour', underwaterExplore: 'Underwater Explore',
    titlePlaceholder: 'Enter title', changeProfilePhoto: 'Change Profile Photo',
    imageProcessFail: 'Image processing failed.', removeProfilePhoto: 'Remove Profile',
    draftSaved: 'Draft saved.', profileUpdated: 'Profile updated successfully.',
    copyLink: 'Copy Link', shareComingSoon: 'Share feature coming soon', commentAdded: 'Comment added successfully.',
    uploadImageRequired: 'Please upload an image', enterContent: 'Please enter content',
    uploadImageFailed: 'Failed to upload image', finish: 'Finish', saveDraft: 'Save Draft',
    imageRequired: 'You must upload an image.', shellCreated: 'Shell created successfully.',
    suggestionsForYou: 'Suggestions for you', seeAll: 'See All', switchAccount: 'Switch Account',
    following: 'Following', follow: 'Follow', options: 'Options', addExistingAccount: 'Add Existing Account',
    footerLinks: 'About · Help · Press · API · Jobs · Privacy · Terms · Locations · Language · Meta Verified',
    searchPlaceholder: 'Search', noSearchResults: 'No search results found.', noComments: 'No comments yet.',
    firstComment: 'Be the first to comment.', leaveReply: 'Leave a reply...', replyBtnText: 'Reply',
    replyAdded: 'Reply added successfully.', editComplete: 'Edit Complete', viewMoreReplies: 'View more replies',
    hideReplies: 'Hide replies', feedError: 'An error occurred:', postError: 'An error occurred:'
  },
  ja: {
    restWalk: '休憩散歩', coastTour: '沿岸観光', underwaterExplore: '水中探査',
    titlePlaceholder: 'タイトルを入力', changeProfilePhoto: 'プロフィール写真変更',
    imageProcessFail: '画像処理に失敗しました。', removeProfilePhoto: 'プロフィール削除',
    draftSaved: '下書き保存されました。', profileUpdated: 'プロフィールが更新されました。',
    copyLink: 'リンクコピー', shareComingSoon: '共有機能準備中', commentAdded: 'コメントが追加されました。',
    uploadImageRequired: '画像をアップロードしてください', enterContent: '内容を入力してください',
    uploadImageFailed: '画像アップロード失敗', finish: '完了', saveDraft: '下書き保存',
    imageRequired: '画像は必須です。', shellCreated: 'シェルが作成されました。',
    suggestionsForYou: 'おすすめのユーザー', seeAll: 'すべて見る', switchAccount: 'アカウント切り替え',
    following: 'フォロー中', follow: 'フォロー', options: 'オプション', addExistingAccount: '既存のアカウントを追加',
    footerLinks: '基本情報 · ヘルプ · プレス · API · 求人 · プライバシー · 規約 · 位置 · 言語 · Meta Verified',
    searchPlaceholder: '検索', noSearchResults: '検索結果がありません。', noComments: 'まだコメントがありません。',
    firstComment: '最初のコメントを残してみましょう。', leaveReply: '返信を残す...', replyBtnText: '返信',
    replyAdded: '返信が作成されました', editComplete: '修正完了', viewMoreReplies: '他の返信を見る',
    hideReplies: '返信を隠す', feedError: 'エラーが発生しました:', postError: 'エラーが発生しました:'
  },
  zh: {
    restWalk: '休憩散步', coastTour: '沿海观光', underwaterExplore: '水下探索',
    titlePlaceholder: '输入标题', changeProfilePhoto: '更改个人头像',
    imageProcessFail: '图片处理失败。', removeProfilePhoto: '移除头像',
    draftSaved: '已保存草稿。', profileUpdated: '个人资料已更新。',
    copyLink: '复制链接', shareComingSoon: '分享功能准备中', commentAdded: '评论已添加。',
    uploadImageRequired: '请上传图片', enterContent: '请输入内容',
    uploadImageFailed: '图片上传失败', finish: '完成', saveDraft: '保存草稿',
    imageRequired: '必须上传图片。', shellCreated: '雪尔已创建。',
    suggestionsForYou: '为您推荐', seeAll: '查看全部', switchAccount: '切换账号',
    following: '正在关注', follow: '关注', options: '选项', addExistingAccount: '添加已有账号',
    footerLinks: '关于 · 帮助 · 新闻 · API · 工作 · 隐私 · 条款 · 位置 · 语言 · Meta Verified',
    searchPlaceholder: '搜索', noSearchResults: '无搜索结果。', noComments: '暂无评论。',
    firstComment: '留下第一条评论吧。', leaveReply: '写下回复...', replyBtnText: '回复',
    replyAdded: '回复已添加', editComplete: '修改完成', viewMoreReplies: '查看更多回复',
    hideReplies: '隐藏回复', feedError: '发生错误:', postError: '发生错误:'
  }
};

for (const [langCode, keys] of Object.entries(newTranslations)) {
  const replacement = Object.entries(keys).map(([k, v]) => `    ${k}: '${v}',`).join('\n');
  lang = lang.replace(new RegExp(`(${langCode}: \\{\\s*)`), `$1${replacement}\n`);
}

fs.writeFileSync('public/js/lang.js', lang);
console.log('lang.js updated');
