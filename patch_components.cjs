const fs = require('fs');

let c = fs.readFileSync('public/js/components.js', 'utf8');

c = c.replace(/localStorage\.getItem\('koral_language'\) === 'en' \? 'Copy Link' : '링크 복사'/g, "t('copyLink')");
c = c.replace(/'공유 기능 준비중'/g, "t('shareComingSoon')");
c = c.replace(/t\('loginRequired'\) \|\| '로그인이 필요합니다\.?'/g, "t('loginRequired')");
c = c.replace(/'로그인이 필요합니다\.?'/g, "t('loginRequired')");
c = c.replace(/localStorage\.getItem\('koral_language'\) === 'en' \? 'Comment added successfully\.' : '댓글이 작성되었습니다'/g, "t('commentAdded')");
c = c.replace(/t\('editDraft', '임시저장 편집'\)/g, "t('editDraft')");

c = c.replace(/currentLang === 'ko' \? '이미지를 업로드해주세요' : currentLang === 'ja' \? '画像をアップロードしてください' : currentLang === 'zh' \? '请上传图片' : 'Please upload an image'/g, "t('uploadImageRequired')");
c = c.replace(/currentLang === 'ko' \? '내용을 입력하세요' : 'Please enter content'/g, "t('enterContent')");
c = c.replace(/currentLang === 'ko' \? '이미지 업로드 실패' : 'Failed to upload image'/g, "t('uploadImageFailed')");
c = c.replace(/t\('finishUpload', '완료'\)/g, "t('finishUpload')");
c = c.replace(/currentLang === 'ko' \? '임시저장 되었습니다\.' : 'Draft saved\.'/g, "t('draftSaved')");
c = c.replace(/'임시저장'/g, "t('saveDraft')");
c = c.replace(/currentLang === 'ko' \? '이미지를 필수로 업로드해야 합니다\.' : 'You must upload an image\.'/g, "t('imageRequired')");
c = c.replace(/currentLang === 'ko' \? '셸이 완성되었습니다\.' : 'Shell created successfully\.'/g, "t('shellCreated')");
c = c.replace(/t\('newShell'\)/g, "t('newShell')");

c = c.replace(/currentLang === 'ko' \? '회원님을 위한 추천' : currentLang === 'ja' \? 'おすすめのユーザー' : currentLang === 'zh' \? '为您推荐' : 'Suggestions for you'/g, "t('suggestionsForYou')");
c = c.replace(/currentLang === 'ko' \? '모두 보기' : currentLang === 'ja' \? 'すべて見る' : currentLang === 'zh' \? '查看全部' : 'See All'/g, "t('seeAll')");
c = c.replace(/currentLang === 'ko' \? '계정 전환' : currentLang === 'ja' \? 'アカウント切り替え' : currentLang === 'zh' \? '切换账号' : 'Switch Account'/g, "t('switchAccount')");
c = c.replace(/currentLang === 'ko' \? '로그아웃' : currentLang === 'ja' \? 'ログアウト' : currentLang === 'zh' \? '退出登录' : 'Log out'/g, "t('logout')");
c = c.replace(/currentLang === 'ko' \? '팔로잉' : currentLang === 'ja' \? 'フォロー中' : currentLang === 'zh' \? '正在关注' : 'Following'/g, "t('following')");
c = c.replace(/currentLang === 'ko' \? '팔로우' : currentLang === 'ja' \? 'フォロー' : currentLang === 'zh' \? '关注' : 'Follow'/g, "t('follow')");
c = c.replace(/currentLang === 'ko' \? '옵션' : currentLang === 'ja' \? 'オプション' : currentLang === 'zh' \? '选项' : 'Options'/g, "t('options')");
c = c.replace(/currentLang === 'ko' \? '기존 계정 추가' : currentLang === 'ja' \? '既存のアカウントを追加' : currentLang === 'zh' \? '添加已有账号' : 'Add Existing Account'/g, "t('addExistingAccount')");
c = c.replace(/currentLang === 'ko' \? '소개 · 도움말 · 홍보 센터 · API · 채용 정보 · 개인정보처리방침 · 약관 · 위치 · 언어 · Meta Verified' :\s*currentLang === 'ja' \? '基本情報 · ヘルプ · プレス · API · 求人 · プライバシー · 規約 · 位置 · 言語 · Meta Verified' :\s*currentLang === 'zh' \? '关于 · 帮助 · 新闻 · API · 工作 · 隐私 · 条款 · 位置 · 语言 · Meta Verified' :\s*'About · Help · Press · API · Jobs · Privacy · Terms · Locations · Language · Meta Verified'/g, "t('footerLinks')");

c = c.replace(/'시스템 설정'/g, "t('themeSystem')");
c = c.replace(/'기기 설정에 맞춤'/g, "t('themeSystemDesc')");
c = c.replace(/'라이트 모드'/g, "t('themeLight')");
c = c.replace(/'밝은 테마'/g, "t('themeLightDesc')");
c = c.replace(/'다크 모드'/g, "t('themeDark')");
c = c.replace(/'어두운 테마'/g, "t('themeDarkDesc')");

c = c.replace(/'검색'/g, "t('searchPlaceholder')");
c = c.replace(/'검색 결과가 없습니다\.'/g, "t('noSearchResults')");
c = c.replace(/'아직 댓글이 없습니다\.'/g, "t('noComments')");
c = c.replace(/'가장 먼저 댓글을 남겨보세요\.'/g, "t('firstComment')");
c = c.replace(/`\$\{handleForPlaceholder\}에게 답글 남기기\.\.\.`/g, "`@${handleForPlaceholder} ` + t('leaveReply')");
c = c.replace(/'답글 달기'/g, "t('leaveReply')");
c = c.replace(/'답글이 작성되었습니다'/g, "t('replyAdded')");
c = c.replace(/'답글'/g, "t('replyBtnText')");
c = c.replace(/'수정 완료'/g, "t('editComplete')");
c = c.replace(/`ㅡ 더 많은 답글 보기 \(\$\{c\.replies\.length\}개\)`/g, "`ㅡ ` + t('viewMoreReplies') + ` (${c.replies.length})`");
c = c.replace(/'ㅡ 답글 숨기기'/g, "`ㅡ ` + t('hideReplies')");

// We also need to fix animation in pages.js createCol
let p = fs.readFileSync('public/js/pages.js', 'utf8');
p = p.replace(
  /const createCol = \(title, iconName, items\) => \{\n\s*const col = el\('div', \{ className: 'flex flex-col gap-6' \}\);/g,
  `let animDelay = 0;
      const createCol = (title, iconName, items) => {
        const col = el('div', { className: 'flex flex-col gap-6 anim-slide-up', style: { animationDelay: (animDelay++ * 0.15) + 's' } });`
);

fs.writeFileSync('public/js/components.js', c);
fs.writeFileSync('public/js/pages.js', p);
console.log('components.js and pages.js updated');
