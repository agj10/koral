const fs = require('fs');

// 1. Update lang.js with remaining keys
let lang = fs.readFileSync('public/js/lang.js', 'utf8');

const newTranslations = {
  ko: {
    colorSelect: '색상 선택', saturation: '채도', brightness: '명도', enterContentEllipsis: '내용을 입력하세요...',
    registerBtn2: '등록', mediaAttachFailed: '미디어 첨부 실패', enterLinkUrl: '링크 URL을 입력하세요:',
    fontSize: '글자 크기', fontFamily: '폰트', fontColor: '글자 색상', bold: '굵게', italic: '기울임',
    underline: '밑줄', strikethrough: '취소선', alignLeft: '왼쪽 정렬', alignCenter: '가운데 정렬',
    alignRight: '오른쪽 정렬', alignJustify: '양쪽 정렬', insertLink: '링크 삽입', attachMedia: '미디어/파일 첨부',
    timeJustNow: '방금', timeMinsAgo: '{m}분 전', timeHoursAgo: '{h}시간 전', timeDaysAgo: '{d}일 전', timeWeeksAgo: '{w}주 전',
    timeDate: '{y}년 {m}월 {d}일', confirmBtn: '확인', cancelBtn: '취소', selectBtn: '선택'
  },
  en: {
    colorSelect: 'Select Color', saturation: 'Saturation', brightness: 'Brightness', enterContentEllipsis: 'Enter content...',
    registerBtn2: 'Submit', mediaAttachFailed: 'Failed to attach media', enterLinkUrl: 'Enter link URL:',
    fontSize: 'Font Size', fontFamily: 'Font', fontColor: 'Font Color', bold: 'Bold', italic: 'Italic',
    underline: 'Underline', strikethrough: 'Strikethrough', alignLeft: 'Align Left', alignCenter: 'Align Center',
    alignRight: 'Align Right', alignJustify: 'Justify', insertLink: 'Insert Link', attachMedia: 'Attach Media/File',
    timeJustNow: 'Just now', timeMinsAgo: '{m}m ago', timeHoursAgo: '{h}h ago', timeDaysAgo: '{d}d ago', timeWeeksAgo: '{w}w ago',
    timeDate: '{y}-{m}-{d}', confirmBtn: 'Confirm', cancelBtn: 'Cancel', selectBtn: 'Select'
  },
  ja: {
    colorSelect: '色を選択', saturation: '彩度', brightness: '明度', enterContentEllipsis: '内容を入力してください...',
    registerBtn2: '登録', mediaAttachFailed: 'メディア添付失敗', enterLinkUrl: 'リンクURLを入力してください:',
    fontSize: '文字サイズ', fontFamily: 'フォント', fontColor: '文字色', bold: '太字', italic: '斜体',
    underline: '下線', strikethrough: '取り消し線', alignLeft: '左揃え', alignCenter: '中央揃え',
    alignRight: '右揃え', alignJustify: '両端揃え', insertLink: 'リンク挿入', attachMedia: 'メディア/ファイル添付',
    timeJustNow: 'たった今', timeMinsAgo: '{m}分前', timeHoursAgo: '{h}時間前', timeDaysAgo: '{d}日前', timeWeeksAgo: '{w}週間前',
    timeDate: '{y}年{m}月{d}日', confirmBtn: '確認', cancelBtn: 'キャンセル', selectBtn: '選択'
  },
  zh: {
    colorSelect: '选择颜色', saturation: '饱和度', brightness: '亮度', enterContentEllipsis: '请输入内容...',
    registerBtn2: '提交', mediaAttachFailed: '媒体附件失败', enterLinkUrl: '输入链接网址:',
    fontSize: '字体大小', fontFamily: '字体', fontColor: '字体颜色', bold: '加粗', italic: '斜体',
    underline: '下划线', strikethrough: '删除线', alignLeft: '左对齐', alignCenter: '居中对齐',
    alignRight: '右对齐', alignJustify: '两端对齐', insertLink: '插入链接', attachMedia: '附加媒体/文件',
    timeJustNow: '刚刚', timeMinsAgo: '{m}分钟前', timeHoursAgo: '{h}小时前', timeDaysAgo: '{d}天前', timeWeeksAgo: '{w}周前',
    timeDate: '{y}年{m}月{d}日', confirmBtn: '确认', cancelBtn: '取消', selectBtn: '选择'
  }
};

for (const [langCode, keys] of Object.entries(newTranslations)) {
  const replacement = Object.entries(keys).map(([k, v]) => `    ${k}: '${v}',`).join('\n');
  lang = lang.replace(new RegExp(`(${langCode}: \\{\\s*)`), `$1${replacement}\n`);
}
fs.writeFileSync('public/js/lang.js', lang);

// 2. Patch editor.js
let editor = fs.readFileSync('public/js/editor.js', 'utf8');

if (!editor.includes("import { t }")) {
  editor = editor.replace(/import \{ icons \}/, "import { t } from './lang.js?v=5';\nimport { icons }");
}

editor = editor.replace(/'색상 선택'/g, "t('colorSelect')");
editor = editor.replace(/'채도'/g, "t('saturation')");
editor = editor.replace(/'명도'/g, "t('brightness')");
editor = editor.replace(/'내용을 입력하세요\.\.\.'/g, "t('enterContentEllipsis')");
editor = editor.replace(/submitLabel = '등록'/g, "submitLabel = t('registerBtn2')");
editor = editor.replace(/'제목을 입력하세요'/g, "t('titlePlaceholder')");
editor = editor.replace(/'미디어 첨부 실패'/g, "t('mediaAttachFailed')");
editor = editor.replace(/'링크 URL을 입력하세요:'/g, "t('enterLinkUrl')");
editor = editor.replace(/'글자 크기'/g, "t('fontSize')");
editor = editor.replace(/'폰트'/g, "t('fontFamily')");
editor = editor.replace(/'글자 색상'/g, "t('fontColor')");
editor = editor.replace(/'굵게'/g, "t('bold')");
editor = editor.replace(/'기울임'/g, "t('italic')");
editor = editor.replace(/'밑줄'/g, "t('underline')");
editor = editor.replace(/'취소선'/g, "t('strikethrough')");
editor = editor.replace(/'왼쪽 정렬'/g, "t('alignLeft')");
editor = editor.replace(/'가운데 정렬'/g, "t('alignCenter')");
editor = editor.replace(/'오른쪽 정렬'/g, "t('alignRight')");
editor = editor.replace(/'양쪽 정렬'/g, "t('alignJustify')");
editor = editor.replace(/'링크 삽입'/g, "t('insertLink')");
editor = editor.replace(/'미디어\/파일 첨부'/g, "t('attachMedia')");
editor = editor.replace(/'임시저장'/g, "t('saveDraft')");

fs.writeFileSync('public/js/editor.js', editor);

// 3. Patch utils.js
let utils = fs.readFileSync('public/js/utils.js', 'utf8');
if (!utils.includes("import { t }")) {
  utils = "import { t } from './lang.js?v=5';\n" + utils;
}

utils = utils.replace(/return "방금";/g, "return t('timeJustNow');");
utils = utils.replace(/return `\$\{Math\.floor\(diffInSeconds \/ 60\)\}분 전`;/g, "return t('timeMinsAgo').replace('{m}', Math.floor(diffInSeconds / 60));");
utils = utils.replace(/return `\$\{Math\.floor\(diffInSeconds \/ 3600\)\}시간 전`;/g, "return t('timeHoursAgo').replace('{h}', Math.floor(diffInSeconds / 3600));");
utils = utils.replace(/return `\$\{Math\.floor\(diffInSeconds \/ 86400\)\}일 전`;/g, "return t('timeDaysAgo').replace('{d}', Math.floor(diffInSeconds / 86400));");
utils = utils.replace(/return `\$\{Math\.floor\(diffInSeconds \/ 604800\)\}주 전`;/g, "return t('timeWeeksAgo').replace('{w}', Math.floor(diffInSeconds / 604800));");
utils = utils.replace(/return `\$\{date\.getFullYear\(\)\}년 \$\{date\.getMonth\(\) \+ 1\}월 \$\{date\.getDate\(\)\}일`;/g, "return t('timeDate').replace('{y}', date.getFullYear()).replace('{m}', date.getMonth() + 1).replace('{d}', date.getDate());");
utils = utils.replace(/'확인'/g, "t('confirmBtn')");
utils = utils.replace(/'취소'/g, "t('cancelBtn')");
utils = utils.replace(/placeholder \|\| '선택'/g, "placeholder || t('selectBtn')");

fs.writeFileSync('public/js/utils.js', utils);

// 4. Also double-check components.js for any remaining `[가-힣]`
let components = fs.readFileSync('public/js/components.js', 'utf8');
components = components.replace(/'수정되었습니다\.'/g, "t('editSuccess')");
components = components.replace(/'수정'/g, "t('edit')");
components = components.replace(/'이 댓글을 삭제하시겠습니까\?'/g, "t('deleteConfirm')");
components = components.replace(/'삭제되었습니다\.'/g, "t('deleteSuccess')");
components = components.replace(/'삭제'/g, "t('delete')");
components = components.replace(/'자세히 보기'/g, "t('viewMore')");
components = components.replace(/'간단히 보기'/g, "t('viewLess')");
components = components.replace(/' \(수정됨\)'/g, "t('edited')");
components = components.replace(/`답글 \$\{replyData\.length\}개 보기`/g, "t('viewReplies').replace('{n}', replyData.length)");
components = components.replace(/`답글 \$\{replyData\.length\}개 숨기기`/g, "t('hideRepliesNum').replace('{n}', replyData.length)");

fs.writeFileSync('public/js/components.js', components);

// Ensure lang.js has edited, viewReplies, hideRepliesNum
lang = fs.readFileSync('public/js/lang.js', 'utf8');
const extraTranslations = {
  ko: { edited: ' (수정됨)', viewReplies: '답글 {n}개 보기', hideRepliesNum: '답글 {n}개 숨기기' },
  en: { edited: ' (edited)', viewReplies: 'View {n} replies', hideRepliesNum: 'Hide {n} replies' },
  ja: { edited: ' (編集済み)', viewReplies: '{n}件の返信を見る', hideRepliesNum: '{n}件の返信を隠す' },
  zh: { edited: ' (已编辑)', viewReplies: '查看 {n} 条回复', hideRepliesNum: '隐藏 {n} 条回复' }
};
for (const [langCode, keys] of Object.entries(extraTranslations)) {
  const replacement = Object.entries(keys).map(([k, v]) => `    ${k}: '${v}',`).join('\n');
  lang = lang.replace(new RegExp(`(${langCode}: \\{\\s*)`), `$1${replacement}\n`);
}
fs.writeFileSync('public/js/lang.js', lang);

// Bump version in index.html and update_imports to force reloading of ALL files again!
let index = fs.readFileSync('public/index.html', 'utf8');
index = index.replace(/v=5/g, 'v=6');
fs.writeFileSync('public/index.html', index);

const files = ['components.js', 'editor.js', 'main.js', 'pages.js', 'store.js', 'utils.js', 'lang.js', 'icons.js', 'waves.js'];
files.forEach(f => {
  const p = 'public/js/' + f;
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/v=5/g, 'v=6');
    content = content.replace(/from '\.\/([a-z.]+)(\?v=[0-9]+)?'/g, "from './$1?v=6'");
    content = content.replace(/import\('\.\/([a-z.]+)(\?v=[0-9]+)?'\)/g, "import('./$1?v=6')");
    fs.writeFileSync(p, content);
  }
});
console.log('All files updated and bumped to v=6');
