const fs = require('fs');

let lang = fs.readFileSync('public/js/lang.js', 'utf8');

const newKeys = {
  ko: {
    themeTitle: '테마', themeSub: '앱의 화면 모드를 설정하세요.',
    themeSystem: '시스템 설정', themeSystemSub: '기기 설정에 맞춤',
    themeLight: '라이트 모드', themeLightSub: '밝은 테마',
    themeDark: '다크 모드', themeDarkSub: '어두운 테마',
    changeHandle: '핸들 변경', changeHandleSub: '고유한 사용자 아이디를 변경합니다.',
    changePwTitle: '비밀번호 변경', changePwSub: '계정의 비밀번호를 안전하게 재설정합니다.',
    delAccDesc: '계정과 모든 데이터를 영구적으로 삭제합니다.',
    restWalk: '쉼터 산책', coastTour: '연안 관광', underwaterExplore: '수중 탐사',
    titlePlaceholder: '제목을 입력하세요', changeProfilePhoto: '프로필 사진 변경',
    imageProcessFail: '이미지 처리에 실패했습니다.', removeProfilePhoto: '프로필 제거',
    draftSaved: '임시저장 되었습니다.', profileUpdated: '프로필이 업데이트되었습니다.'
  },
  en: {
    themeTitle: 'Theme', themeSub: 'Set the app display mode.',
    themeSystem: 'System Settings', themeSystemSub: 'Match device settings',
    themeLight: 'Light Mode', themeLightSub: 'Light theme',
    themeDark: 'Dark Mode', themeDarkSub: 'Dark theme',
    changeHandle: 'Change Handle', changeHandleSub: 'Change your unique user ID.',
    changePwTitle: 'Change Password', changePwSub: 'Securely reset your account password.',
    delAccDesc: 'Permanently delete your account and all data.',
    restWalk: 'Rest Walk', coastTour: 'Coast Tour', underwaterExplore: 'Underwater Explore',
    titlePlaceholder: 'Enter title', changeProfilePhoto: 'Change Profile Photo',
    imageProcessFail: 'Failed to process image.', removeProfilePhoto: 'Remove Profile',
    draftSaved: 'Draft saved.', profileUpdated: 'Profile updated successfully.'
  },
  ja: {
    themeTitle: 'テーマ', themeSub: 'アプリの画面モードを設定します。',
    themeSystem: 'システム設定', themeSystemSub: 'デバイス設定に合わせる',
    themeLight: 'ライトモード', themeLightSub: '明るいテーマ',
    themeDark: 'ダークモード', themeDarkSub: '暗いテーマ',
    changeHandle: 'ハンドル変更', changeHandleSub: '固有のユーザーIDを変更します。',
    changePwTitle: 'パスワード変更', changePwSub: 'アカウントのパスワードを安全にリセットします。',
    delAccDesc: 'アカウントとすべてのデータを永久に削除します。',
    restWalk: '休憩散歩', coastTour: '沿岸観光', underwaterExplore: '水中探査',
    titlePlaceholder: 'タイトルを入力', changeProfilePhoto: 'プロフィール写真変更',
    imageProcessFail: '画像処理に失敗しました。', removeProfilePhoto: 'プロフィール削除',
    draftSaved: '下書き保存されました。', profileUpdated: 'プロフィールが更新されました。'
  },
  zh: {
    themeTitle: '主题', themeSub: '设置应用显示模式。',
    themeSystem: '系统设置', themeSystemSub: '匹配设备设置',
    themeLight: '浅色模式', themeLightSub: '浅色主题',
    themeDark: '深色模式', themeDarkSub: '深色主题',
    changeHandle: '更改句柄', changeHandleSub: '更改您的唯一用户ID。',
    changePwTitle: '更改密码', changePwSub: '安全地重置您的账户密码。',
    delAccDesc: '永久删除您的账号和所有数据。',
    restWalk: '休憩散步', coastTour: '沿海观光', underwaterExplore: '水下探索',
    titlePlaceholder: '输入标题', changeProfilePhoto: '更改个人头像',
    imageProcessFail: '图片处理失败。', removeProfilePhoto: '移除头像',
    draftSaved: '已保存草稿。', profileUpdated: '个人资料已更新。'
  }
};

for (const [langCode, keys] of Object.entries(newKeys)) {
  const replacement = Object.entries(keys).map(([k, v]) => `    ${k}: '${v}',`).join('\n');
  lang = lang.replace(new RegExp(`(${langCode}: \\{\n)`, 'g'), `$1${replacement}\n`);
}

fs.writeFileSync('public/js/lang.js', lang);

let pages = fs.readFileSync('public/js/pages.js', 'utf8');

pages = pages.replace(/placeholder: '검색어를 입력하세요...'/g, "placeholder: t('placeholderSearch')");
pages = pages.replace(/'전체', '사진', '일상', '개발', '디자인', '기타'/g, "t('catAll'), t('catPhoto'), t('catDaily'), t('catDev'), t('catDesign'), t('catEtc')");
pages = pages.replace(/'전체'/g, "t('catAll')");
pages = pages.replace(/'카테고리'/g, "t('category')");
pages = pages.replace(/'최근 검색어'/g, "t('recentSearches')");
pages = pages.replace(/'전체 삭제'/g, "t('clearAll')");
pages = pages.replace(/'최근 검색 기록이 없습니다.'/g, "t('noRecentSearches')");
pages = pages.replace(/'추천 검색어'/g, "t('recommendedSearches')");
pages = pages.replace(/'탐색 추천'/g, "t('exploreSuggestions')");
pages = pages.replace(/`'\\$\\{query\\}' 검색 결과`/g, "'' + query + ' ' + t('searchResultsFor')");
pages = pages.replace(/'사용자가 없습니다.'/g, "t('noUsersFound')");
pages = pages.replace(/title: '프로필 편집'/g, "title: t('editProfile')");
pages = pages.replace(/'자세히 보기'/g, "t('viewMore')");
pages = pages.replace(/'간략히 보기'/g, "t('viewLess')");
pages = pages.replace(/'작성 중'/g, "t('draftBadge')");
pages = pages.replace(/'내용 없음'/g, "t('noContent')");

pages = pages.replace(/'비밀번호가 일치하지 않습니다.'/g, "t('passwordMismatch')");
pages = pages.replace(/'유효한 이메일을 입력해주세요.'/g, "t('invalidEmail')");
pages = pages.replace(/'발송중\.\.\.'/g, "t('sending')");
pages = pages.replace(/'입력하신 이메일로 인증코드가 발송되었습니다.'/g, "t('codeSent')");
pages = pages.replace(/'재발송'/g, "t('resend')");
pages = pages.replace(/'발송 실패'/g, "t('sendFailed')");
pages = pages.replace(/'인증 발송'/g, "t('sendCode')");
pages = pages.replace(/'인증코드 6자리'/g, "t('verificationCode')");
pages = pages.replace(/'비밀번호 확인'/g, "t('confirmPassword')");
pages = pages.replace(/'koral은 개발자를 위한 마크다운 기반 SNS입니다[^']*'/g, "t('termsText')");
pages = pages.replace(/'이미지 처리 중 오류가 발생했습니다.'/g, "t('imageError')");

pages = pages.replace(/'계정을 삭제하려면 현재 비밀번호를 입력하세요. 삭제된 계정은 복구할 수 없습니다.'/g, "t('accDelWarning')");
pages = pages.replace(/'현재 비밀번호'/g, "t('currentPw')");
pages = pages.replace(/'비밀번호 입력'/g, "t('pwPlaceholder')");
pages = pages.replace(/'계정 삭제하기'/g, "t('delAccBtn')");
pages = pages.replace(/'계정 삭제'/g, "t('delAccTitle')");
pages = pages.replace(/'취소'/g, "t('cancel')");

pages = pages.replace(/'테마'/g, "t('themeTitle')");
pages = pages.replace(/'앱의 화면 모드를 설정하세요.'/g, "t('themeSub')");
pages = pages.replace(/'시스템 설정'/g, "t('themeSystem')");
pages = pages.replace(/'기기 설정에 맞춤'/g, "t('themeSystemSub')");
pages = pages.replace(/'라이트 모드'/g, "t('themeLight')");
pages = pages.replace(/'밝은 테마'/g, "t('themeLightSub')");
pages = pages.replace(/'다크 모드'/g, "t('themeDark')");
pages = pages.replace(/'어두운 테마'/g, "t('themeDarkSub')");

pages = pages.replace(/'핸들 변경'/g, "t('changeHandle')");
pages = pages.replace(/'고유한 사용자 아이디를 변경합니다.'/g, "t('changeHandleSub')");
pages = pages.replace(/'비밀번호 변경'/g, "t('changePwTitle')");
pages = pages.replace(/'계정의 비밀번호를 안전하게 재설정합니다.'/g, "t('changePwSub')");
pages = pages.replace(/'계정과 모든 데이터를 영구적으로 삭제합니다.'/g, "t('delAccDesc')");

pages = pages.replace(/'쉼터 산책'/g, "t('restWalk')");
pages = pages.replace(/'연안 관광'/g, "t('coastTour')");
pages = pages.replace(/'수중 탐사'/g, "t('underwaterExplore')");
pages = pages.replace(/'제목을 입력하세요'/g, "t('titlePlaceholder')");

pages = pages.replace(/'프로필 사진 변경'/g, "t('changeProfilePhoto')");
pages = pages.replace(/'이미지 처리에 실패했습니다.'/g, "t('imageProcessFail')");
pages = pages.replace(/'프로필 제거'/g, "t('removeProfilePhoto')");

pages = pages.replace(/toast\(currentLang === 'ko' \? '리프가 생성되었습니다\.' : 'Reef created successfully\.', 'success'\);/g, "toast(t('reefCreated'), 'success');");
pages = pages.replace(/toast\(currentLang === 'ko' \? '임시저장 되었습니다\.' : 'Draft saved\.', 'success'\);/g, "toast(t('draftSaved'), 'success');");
pages = pages.replace(/toast\(localStorage\.getItem\('koral_language'\) === 'en' \? 'Profile updated successfully\.' : '프로필이 업데이트되었습니다\.', 'success'\);/g, "toast(t('profileUpdated'), 'success');");

fs.writeFileSync('public/js/pages.js', pages);
console.log('Update complete!');
