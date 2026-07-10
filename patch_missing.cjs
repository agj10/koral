const fs = require('fs');

const missingTrans = {
  ko: {
    catAll: '전체', catPhoto: '사진', catDaily: '일상', catDev: '개발', catDesign: '디자인', catEtc: '기타', category: '카테고리',
    exploreSuggestions: '추천 계정', noUsersFound: '사용자를 찾을 수 없습니다.', viewMore: '더보기', viewLess: '접기',
    draftBadge: '임시저장', noContent: '내용 없음', saved: '저장됨', notFound: '찾을 수 없음', langChanged: '언어가 변경되었습니다.',
    addAccountTitle: '계정 추가', addAccountSub: '기존 계정으로 로그인하거나 새 계정을 만드세요.', passwordMismatch: '비밀번호가 일치하지 않습니다.',
    invalidEmail: '유효한 이메일 주소를 입력하세요.', sending: '전송 중...', codeSent: '인증 코드가 전송되었습니다.', resend: '재전송',
    sendFailed: '전송에 실패했습니다.', sendCode: '코드 전송', verificationCode: '인증 코드', confirmPassword: '비밀번호 확인',
    termsText: '이용 약관', imageError: '이미지 로드 오류', editDraft: '임시저장 수정', themeTitle: '테마',
    themeSub: '앱의 테마를 설정합니다.', accSecurity: '계정 보안', handleChangedMsg: '핸들이 변경되었습니다.', changeHandle: '핸들 변경',
    newHandle: '새 핸들', currentPw: '현재 비밀번호', pwPlaceholder: '비밀번호 입력', cancel: '취소', changeBtn: '변경하기',
    pwChangedMsg: '비밀번호가 변경되었습니다.', changePwTitle: '비밀번호 변경', newPw: '새 비밀번호', pwReqs: '최소 8자 이상',
    delAccConfirmMsg: '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.', accDeletedMsg: '계정이 삭제되었습니다.', delAccTitle: '계정 삭제',
    accDelWarning: '계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.', delAccBtn: '계정 삭제하기', changeHandleSub: '새로운 핸들로 변경합니다.',
    changePwSub: '비밀번호를 변경합니다.', delAccDesc: '계정을 영구적으로 삭제합니다.', langKo: '한국어', langEn: 'English', langJa: '日本語', langZh: '中文'
  },
  en: {
    catAll: 'All', catPhoto: 'Photo', catDaily: 'Daily', catDev: 'Dev', catDesign: 'Design', catEtc: 'Etc', category: 'Category',
    exploreSuggestions: 'Suggested for you', noUsersFound: 'No users found.', viewMore: 'View More', viewLess: 'View Less',
    draftBadge: 'Draft', noContent: 'No content', saved: 'Saved', notFound: 'Not found', langChanged: 'Language changed.',
    addAccountTitle: 'Add Account', addAccountSub: 'Log into an existing account or create a new one.', passwordMismatch: 'Passwords do not match.',
    invalidEmail: 'Please enter a valid email address.', sending: 'Sending...', codeSent: 'Verification code sent.', resend: 'Resend',
    sendFailed: 'Failed to send.', sendCode: 'Send Code', verificationCode: 'Verification Code', confirmPassword: 'Confirm Password',
    termsText: 'Terms of Service', imageError: 'Image load error', editDraft: 'Edit Draft', themeTitle: 'Theme',
    themeSub: 'Configure app theme.', accSecurity: 'Account Security', handleChangedMsg: 'Handle changed.', changeHandle: 'Change Handle',
    newHandle: 'New Handle', currentPw: 'Current Password', pwPlaceholder: 'Enter password', cancel: 'Cancel', changeBtn: 'Change',
    pwChangedMsg: 'Password changed.', changePwTitle: 'Change Password', newPw: 'New Password', pwReqs: 'At least 8 characters',
    delAccConfirmMsg: 'Are you sure you want to delete your account? This action cannot be undone.', accDeletedMsg: 'Account deleted.', delAccTitle: 'Delete Account',
    accDelWarning: 'Deleting your account will permanently remove all data.', delAccBtn: 'Delete Account', changeHandleSub: 'Change to a new handle.',
    changePwSub: 'Change your password.', delAccDesc: 'Permanently delete your account.', langKo: '한국어', langEn: 'English', langJa: '日本語', langZh: '中文'
  },
  ja: {
    catAll: 'すべて', catPhoto: '写真', catDaily: '日常', catDev: '開発', catDesign: 'デザイン', catEtc: 'その他', category: 'カテゴリー',
    exploreSuggestions: 'おすすめ', noUsersFound: 'ユーザーが見つかりません。', viewMore: 'もっと見る', viewLess: '折りたたむ',
    draftBadge: '下書き', noContent: '内容なし', saved: '保存済み', notFound: '見つかりません', langChanged: '言語が変更されました。',
    addAccountTitle: 'アカウント追加', addAccountSub: '既存のアカウントでログインするか、新しく作成します。', passwordMismatch: 'パスワードが一致しません。',
    invalidEmail: '有効なメールアドレスを入力してください。', sending: '送信中...', codeSent: '認証コードが送信されました。', resend: '再送信',
    sendFailed: '送信に失敗しました。', sendCode: 'コード送信', verificationCode: '認証コード', confirmPassword: 'パスワード確認',
    termsText: '利用規約', imageError: '画像読み込みエラー', editDraft: '下書きを編集', themeTitle: 'テーマ',
    themeSub: 'アプリのテーマを設定します。', accSecurity: 'アカウントセキュリティ', handleChangedMsg: 'ハンドルが変更されました。', changeHandle: 'ハンドル変更',
    newHandle: '新しいハンドル', currentPw: '現在のパスワード', pwPlaceholder: 'パスワードを入力', cancel: 'キャンセル', changeBtn: '変更する',
    pwChangedMsg: 'パスワードが変更されました。', changePwTitle: 'パスワード変更', newPw: '新しいパスワード', pwReqs: '8文字以上',
    delAccConfirmMsg: '本当にアカウントを削除しますか？この操作は元に戻せません。', accDeletedMsg: 'アカウントが削除されました。', delAccTitle: 'アカウント削除',
    accDelWarning: 'アカウントを削除すると、すべてのデータが永久に削除されます。', delAccBtn: 'アカウントを削除する', changeHandleSub: '新しいハンドルに変更します。',
    changePwSub: 'パスワードを変更します。', delAccDesc: 'アカウントを完全に削除します。', langKo: '한국어', langEn: 'English', langJa: '日本語', langZh: '中文'
  },
  zh: {
    catAll: '全部', catPhoto: '照片', catDaily: '日常', catDev: '开发', catDesign: '设计', catEtc: '其他', category: '分类',
    exploreSuggestions: '为您推荐', noUsersFound: '未找到用户。', viewMore: '查看更多', viewLess: '收起',
    draftBadge: '草稿', noContent: '无内容', saved: '已保存', notFound: '未找到', langChanged: '语言已更改。',
    addAccountTitle: '添加账号', addAccountSub: '登录现有账号或创建新账号。', passwordMismatch: '密码不匹配。',
    invalidEmail: '请输入有效的电子邮件地址。', sending: '发送中...', codeSent: '验证码已发送。', resend: '重新发送',
    sendFailed: '发送失败。', sendCode: '发送验证码', verificationCode: '验证码', confirmPassword: '确认密码',
    termsText: '服务条款', imageError: '图片加载错误', editDraft: '编辑草稿', themeTitle: '主题',
    themeSub: '设置应用主题。', accSecurity: '账号安全', handleChangedMsg: '用户名已更改。', changeHandle: '更改用户名',
    newHandle: '新用户名', currentPw: '当前密码', pwPlaceholder: '输入密码', cancel: '取消', changeBtn: '更改',
    pwChangedMsg: '密码已更改。', changePwTitle: '更改密码', newPw: '新密码', pwReqs: '至少8个字符',
    delAccConfirmMsg: '确定要删除您的账号吗？此操作无法撤销。', accDeletedMsg: '账号已删除。', delAccTitle: '删除账号',
    accDelWarning: '删除账号将永久删除所有数据。', delAccBtn: '删除账号', changeHandleSub: '更改为新的用户名。',
    changePwSub: '更改您的密码。', delAccDesc: '永久删除您的账号。', langKo: '한국어', langEn: 'English', langJa: '日本語', langZh: '中文'
  }
};

let langCode = fs.readFileSync('public/js/lang.js', 'utf8');

for (const lang of ['ko', 'en', 'ja', 'zh']) {
  const replacement = Object.entries(missingTrans[lang]).map(([k, v]) => `    ${k}: '${v}',`).join('\n');
  langCode = langCode.replace(new RegExp(`(${lang}: \\{\\s*)`), `$1${replacement}\n`);
}

fs.writeFileSync('public/js/lang.js', langCode);
console.log('lang.js updated with all missing keys!');
