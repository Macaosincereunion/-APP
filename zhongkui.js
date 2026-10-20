/* ================= 模式选择和手势追踪控制变量 ================= */
let currentInteractionMode = 'click'; // 'click' 或 'gesture'
let gestureState = 'idle'; // 'idle', 'shake', 'toss', 'sword', 'result_zoom'
let mpCamera = null;
let mpHands = null;
let gestureCooldown = false;
let wristHistory = [];
let isFistDetected = false;

// 试玩与转化追踪状态
let hasUsedTrial = localStorage.getItem('zhongkuiHasUsedTrial') === 'true';

// 平滑缩放算法使用的 EMA 变量
let currentCardScale = 1.0;
let targetCardScale = 1.0;

function setMode(mode) {
    currentInteractionMode = mode;
    resetDrawState();
    showPage('drawPage');
}

/* ================= 卦象数据区 ================= */
const STANDARD_GUA = [
    { index: 1, name: "乾为天", sequence: [1,1,1,1,1,1], text: "元亨利贞", comment: "刚健中正，诸事顺遂，宜积极进取、坚守正道", imagePath: "工厂2.0/1.webp" },
    { index: 2, name: "坤为地", sequence: [0,0,0,0,0,0], text: "元亨，利牝马之贞", comment: "柔顺包容，顺势而为，以柔克刚、稳守根基", imagePath: "工厂2.0/2.webp" },
    { index: 3, name: "水雷屯", sequence: [1,0,0,0,1,0], text: "元亨利贞，勿用有攸往，利建侯", comment: "艰难起步，先立根基，不宜冒进、静待时机", imagePath: "工厂2.0/3.webp" },
    { index: 4, name: "山水蒙", sequence: [0,1,0,0,0,1], text: "亨，匪我求童蒙，童蒙求我", comment: "虚心求教，主动学习，谦逊受益、不可被动", imagePath: "工厂2.0/4.webp" },
    { index: 5, name: "水天需", sequence: [1,1,1,0,1,0], text: "有孚，光亨，贞吉，利涉大川", comment: "耐心等待，厚积薄发，诚信致胜、静待良机", imagePath: "工厂2.0/5.webp" },
    { index: 6, name: "天水讼", sequence: [0,1,0,1,1,1], text: "有孚，窒惕，中吉，终凶", comment: "避免争执，以和为贵，警惕风险、不可硬争", imagePath: "工厂2.0/6.webp" },
    { index: 7, name: "地水师", sequence: [0,1,0,0,0,0], text: "贞，丈人吉，无咎", comment: "团队协作，任贤用能，稳扎稳打、凝聚人心", imagePath: "工厂2.0/7.webp" },
    { index: 8, name: "水地比", sequence: [0,0,0,0,1,0], text: "吉，原筮元永贞，无咎", comment: "亲近贤良，真诚待人，得人相助、坚守本心", imagePath: "工厂2.0/8.webp" },
    { index: 9, name: "风天小畜", sequence:[1,1,1,0,1,1], text: "亨，密云不雨，自我西郊", comment: "积蓄力量，小步积累，不宜强求、静待时机", imagePath: "工厂2.0/9.webp" },
    { index: 10, name: "天泽履", sequence: [1,1,0,1,1,1], text: "履虎尾，不咥人，亨", comment: "谨慎行事，守礼避祸，化险为夷、步步为营", imagePath: "工厂2.0/10.webp" },
    { index: 11, name: "地天泰", sequence: [1,1,1,0,0,0], text: "小往大来，吉，亨", comment: "顺境通达，居安思危，积极进取、顺势而为", imagePath: "工厂2.0/11.webp" },
    { index: 12, name: "天地否", sequence: [0,0,0,1,1,1], text: "否之匪人，不利君子贞，大往小来", comment: "闭塞不通，低调守正，静待转机、不可冒进", imagePath: "工厂2.0/12.webp" },
    { index: 13, name: "天地同人", sequence:[1,0,1,1,1,1], text: "同人于野，亨，利涉大川，利君子贞", comment: "志同道合，携手共进，同心破难、坚守正道", imagePath: "工厂2.0/13.webp" },
    { index: 14, name: "火天大有", sequence:[1,1,1,1,0,1], text: "元亨", comment: "盛大富有，守成持正，戒骄戒躁、长久稳固", imagePath: "工厂2.0/14.webp" },
    { index: 15, name: "地山谦", sequence: [0,0,1,0,0,0], text: "亨，君子有终", comment: "谦逊低调，汇聚福气，终获善终、谦卑受益", imagePath: "工厂2.0/15.webp" },
    { index: 16, name: "雷地豫", sequence: [0,0,0,1,0,0], text: "利建侯行师", comment: "顺势安乐，建功立业，戒逸戒怠、顺势而为", imagePath: "工厂2.0/16.webp" },
    { index: 17, name: "泽雷随", sequence: [1,0,0,1,1,0], text: "元亨利贞，无咎", comment: "顺势而为，从善如流，坚守正道、灵活应变", imagePath: "工厂2.0/17.webp" },
    { index: 18, name: "山风蛊", sequence: [0,1,1,0,0,1], text: "元亨，利涉大川，先甲三日，后甲三日", comment: "革旧迎新，提前规划，事后复盘、革新成事", imagePath: "工厂2.0/18.webp" },
    { index: 19, name: "地泽临", sequence: [1,1,0,0,0,0], text: "元亨利贞，至于八月有凶", comment: "积极进取，警惕物极必反、把握分寸", imagePath: "工厂2.0/19.webp" },
    { index: 20, name: "风地观", sequence: [0,0,0,0,1,1], text: "盥而不荐，有孚颙若", comment: "冷静观察，审时度势，不盲动、先明真相", imagePath: "工厂2.0/20.webp" },
    { index: 21, name: "火雷噬嗑", sequence: [1,0,0,1,0,1], text: "亨，利用狱", comment: "果断决断，扫清障碍，公正处事、果断破局", imagePath: "工厂2.0/21.webp" },
    { index: 22, name: "山火贲", sequence: [1,0,1,0,0,1], text: "亨，小利有攸往", comment: "注重内涵，适度修饰，不华不实、内外兼修", imagePath: "工厂2.0/22.webp" },
    { index: 23, name: "山地剥", sequence: [0,0,0,0,0,1], text: "不利有攸往", comment: "衰败守成，保全自身，静待转机、不可冒进", imagePath: "工厂2.0/23.webp" },
    { index: 24, name: "地雷复", sequence: [1,0,0,0,0,0], text: "亨，出入无疾，朋来无咎", comment: "否极泰来，修正错误，重新开始、回归正道", imagePath: "工厂2.0/24.webp" },
    { index: 25, name: "天雷无妄", sequence: [1,0,0,1,1,1], text: "元亨利贞，其匪正有眚，不利有攸往", comment: "顺其自然，不存妄念，坚守本心、不可妄为", imagePath: "工厂2.0/25.webp" },
    { index: 26, name: "山天大畜", sequence: [1,1,1,0,0,1], text: "利贞，不家食吉，利涉大川", comment: "厚积薄发，积蓄力量，渡难关、厚积薄发", imagePath: "工厂2.0/26.webp" },
    { index: 27, name: "山雷颐", sequence: [1,0,0,0,0,1], text: "贞吉，观颐，自求口实", comment: "自力更生，修养身心，自给自足、长久安康", imagePath: "工厂2.0/27.webp" },
    { index: 28, name: "泽风大过", sequence: [0,1,1,1,1,0], text: "栋桡，利有攸往，亨", comment: "非常之举，把握分寸，险中求胜、不可过度", imagePath: "工厂2.0/28.webp" },
    { index: 29, name: "坎为水", sequence: [0,1,0,0,1,0], text: "习坎，有孚维心亨，行有尚", comment: "坚守信念，步步为营，险中求存、终得助力", imagePath: "工厂2.0/29.webp" },
    { index: 30, name: "离为火", sequence: [1,0,1,1,0,1], text: "利贞，亨，畜牝牛吉", comment: "依附光明，柔顺中正，温暖助力、顺势而生", imagePath: "工厂2.0/30.webp" },
    { index: 31, name: "泽山咸", sequence: [0,0,1,1,1,0], text: "亨，利贞，取女吉", comment: "心意相通，真诚相待，顺其自然、情投意合", imagePath: "工厂2.0/31.webp" },
    { index: 32, name: "雷风恒", sequence: [0,1,1,1,0,0], text: "亨，无咎，利贞，利有攸往", comment: "持之以恒，坚守原则，长久之道、终有所成", imagePath: "工厂2.0/32.webp" },
    { index: 33, name: "天山遁", sequence: [0,0,1,1,1,1], text: "亨，小利贞", comment: "适时退避，保全自身，以退为进、避祸求安", imagePath: "工厂2.0/33.webp" },
    { index: 34, name: "雷天大壮", sequence: [1,1,1,1,0,0], text: "利贞", comment: "刚健强盛，中正行事，戒刚戒猛、持正守成", imagePath: "工厂2.0/34.webp" },
    { index: 35, name: "火地晋", sequence: [0,0,0,1,0,1], text: "康侯用锡马蕃庶，昼日三接", comment: "步步高升，积极进取，展露才华、前途光明", imagePath: "工厂2.0/35.webp" },
    { index: 36, name: "地火明夷", sequence: [1,0,1,0,0,0], text: "利艰贞", comment: "隐锋芒，守正待时，低调隐忍、静待时机", imagePath: "工厂2.0/36.webp" },
    { index: 37, name: "风火家人", sequence: [1,0,1,0,1,1], text: "利女贞", comment: "家庭和睦，各司其职，家和万事、秩序井然", imagePath: "工厂2.0/37.webp" },
    { index: 38, name: "火泽睽", sequence: [1,1,0,1,0,1], text: "小事吉", comment: "求同存异，包容差异，避免冲突、小事可为", imagePath: "工厂2.0/38.webp" },
    { index: 39, name: "水山蹇", sequence: [0,0,1,0,1,0], text: "利西南，不利东北，利见大人，贞吉", comment: "寻求助力，顺势而为，共渡难关、贵人相助", imagePath: "工厂2.0/39.webp" },
    { index: 40, name: "雷水解", sequence: [0,1,0,1,0,0], text: "利西南，无所往，其来复吉，有攸往，夙吉", comment: "解除困境，顺势而为，放下包袱、及早行动", imagePath: "工厂2.0/40.webp" },
    { index: 41, name: "山泽损", sequence: [1,1,0,0,0,1], text: "有孚，元吉，无咎，可贞，利有攸往", comment: "舍小利，成大事，损己利人、小舍大得", imagePath: "工厂2.0/41.webp" },
    { index: 42, name: "风雷益", sequence: [1,0,0,0,1,1], text: "利有攸往，利涉大川", comment: "互相助力，合作共赢，积极进取、得人相助", imagePath: "工厂2.0/42.webp" },
    { index: 43, name: "泽天夬", sequence: [1,1,1,1,1,0], text: "扬于王庭，孚号，有厉，告自邑，不利即戎，利有攸往", comment: "果断除患，公开决断，戒冲动、果断行事", imagePath: "工厂2.0/43.webp" },
    { index: 44, name: "天风姤", sequence: [0,1,1,1,1,1], text: "女壮，勿用取女", comment: "警惕邂逅，保持清醒，防小人、不可轻信", imagePath: "工厂2.0/44.webp" },
    { index: 45, name: "泽地萃", sequence: [0,0,0,1,1,0], text: "亨，王假有庙，利见大人，亨，利贞，用大牲吉，利有攸往", comment: "同心协力，聚众成事，敬贤礼、凝聚人心", imagePath: "工厂2.0/45.webp" },
    { index: 46, name: "地风升", sequence: [0,1,1,0,0,0], text: "元亨，用见大人，勿恤，南征吉", comment: "稳步上升，寻求助力，步步高升、顺势而为", imagePath: "工厂2.0/46.webp" },
    { index: 47, name: "泽水困", sequence: [0,1,0,1,1,0], text: "亨，贞，大人吉，无咎，有言不信", comment: "坚守本心，静待转机，不辩解、守正待时", imagePath: "工厂2.0/47.webp" },
    { index: 48, name: "水风井", sequence: [0,1,1,0,1,0], text: "改邑不改井，无丧无得，往来井井", comment: "坚守价值，持续奉献，不变初心、长久稳固", imagePath: "工厂2.0/48.webp" },
    { index: 49, name: "泽火革", sequence: [1,0,1,1,1,0], text: "巳日乃孚，元亨利贞，悔亡", comment: "革旧迎新，先信后动，顺势变革、革新成事", imagePath: "工厂2.0/49.webp" },
    { index: 50, name: "火风鼎", sequence: [0,1,1,1,0,1], text: "元吉，亨", comment: "革故鼎新，稳重成事，基业稳固、长久兴盛", imagePath: "工厂2.0/50.webp" },
    { index: 51, name: "震为雷", sequence: [1,0,0,1,0,0], text: "亨，震来虩虩，笑言哑哑，震惊百里，不丧匕鬯", comment: "临危不乱，镇定应变，化险为夷、稳如泰山", imagePath: "工厂2.0/51.webp" },
    { index: 52, name: "艮为山", sequence: [0,0,1,0,0,1], text: "艮其背，不获其身，行其庭，不见其人，无咎", comment: "适时止欲，专注当下，不被干扰、心无旁骛", imagePath: "工厂2.0/52.webp" },
    { index: 53, name: "风山渐", sequence: [0,0,1,0,1,1], text: "女归吉，利贞", comment: "循序渐进，按部就班，水到渠成、不可急躁", imagePath: "工厂2.0/53.webp" },
    { index: 54, name: "雷泽归妹", sequence: [1,1,0,1,0,0], text: "征凶，无攸利", comment: "顺其自然，不强求，戒急躁、顺其自然", imagePath: "工厂2.0/54.webp" },
    { index: 55, name: "雷火丰", sequence: [1,0,1,1,0,0], text: "亨，王假之，勿忧，宜日中", comment: "鼎盛时期，居安思危、防衰败", imagePath: "工厂2.0/55.webp" },
    { index: 56, name: "火山旅", sequence: [0,0,1,1,0,1], text: "小亨，旅贞吉", comment: "随遇而安，低调守正，戒争执、漂泊自安", imagePath: "工厂2.0/56.webp" },
    { index: 57, name: "巽为风", sequence: [0,1,1,0,1,1], text: "小亨，利有攸往，利见大人", comment: "谦逊顺势，借力而行，戒固执、顺势而为", imagePath: "工厂2.0/57.webp" },
    { index: 58, name: "兑为泽", sequence: [1,1,0,1,1,0], text: "亨，利贞", comment: "和悦待人，真诚交流，结善缘、快乐顺遂", imagePath: "工厂2.0/58.webp" },
    { index: 59, name: "风水涣", sequence: [0,1,0,0,1,1], text: "亨，王假有庙，利涉大川，利贞", comment: "化解隔阂，凝聚人心，渡难关、消除疑虑", imagePath: "工厂2.0/59.webp" },
    { index: 60, name: "水泽节", sequence: [1,1,0,0,1,0], text: "亨，苦节不可贞", comment: "适度节制，不苛求，不放纵、把握分寸", imagePath: "工厂2.0/60.webp" },
    { index: 61, name: "风泽中孚", sequence: [1,1,0,0,1,1], text: "豚鱼吉，利涉大川，利贞", comment: "真诚守信，表里如一，得人心、感动他人", imagePath: "工厂2.0/61.webp" },
    { index: 62, name: "雷山小过", sequence: [0,0,1,1,0,0], text: "亨，利贞，可小事，不可大事", comment: "谨慎小事，不贪大，戒冒进、小心行事", imagePath: "工厂2.0/62.webp" },
    { index: 63, name: "水火既济", sequence: [1,0,1,0,1,0], text: "亨小，利贞，初吉终乱", comment: "功成守心，防懈怠、不忘初心", imagePath: "工厂2.0/63.webp" },
    { index: 64, name: "火水未济", sequence: [0,1,0,1,0,1], text: "亨，小狐汔济，濡其尾，无攸利", comment: "坚持到底，慎终如始、不可半途而废", imagePath: "工厂2.0/64.webp" }
];

function findGuaName(yaoArray) {
    for (let i = 0; i < STANDARD_GUA.length; i++) {
        let match = true;
        for (let j = 0; j < 6; j++) {
            const inputType = yaoArray[j].type === 'yang' ? 1 : 0;
            const standardType = STANDARD_GUA[i].sequence[j];
            if (inputType !== standardType) { match = false; break; }
        }
        if (match) return STANDARD_GUA[i].name;
    }
    return '未济卦';
}

function generateChangedYao(mainYaoArray) {
    return mainYaoArray.map(yao => {
        if (yao.isDong) return { type: yao.type === 'yang' ? 'yin' : 'yang', isDong: false };
        return { type: yao.type, isDong: false };
    });
}

const SIXTY_FOUR_GUA = STANDARD_GUA.map(gua => ({ ...gua, originalText: gua.text }));

/* ================= 问题库 ================= */
const QUESTION_LIBRARY = {
    '诚心一问': [],
    '事业前程': ['近期前程气运如何？', '所谋之事能否顺遂？', '是否宜动（转换门庭）？', '同袍关系如何化解？'],
    '财气运势': ['近期财禄如何？', '此番营利是否可为？', '何日可见财星高照？', '求财当往何方？'],
    '姻缘桃花': ['近期红鸾星动否？', '能否结识良缘？', '当前姻缘能否长久定局？', '婚姻迷局如何破解？'],
    '科举学业': ['近期文昌星运如何？', '科举（考试）能否金榜题名？', '心性浮躁如何定慧？', '当向何门求学？'],
    '健康平安': ['近期寿康之气如何？', '身上沉疴当需防范何处？', '家宅可得安康？', '远行是否平顺无虞？'],
    '寻人寻物': ['遗失之物可否复得？', '当向何方寻觅？', '何日可有音讯？', '走失之人能否安返？'],
    '家宅吉凶': ['家宅近期气象如何？', '六亲关系是否和顺？', '高堂健康能否无忧？', '家中庶务是否通达？']
};

let selectedQuestion = null;
let selectedCategory = null;
let throwCount = 0;
let yaoResults = [];
let drawHistory = [];

/* ================= 账号与数据管理 ================= */
let currentUser = null;
let usersDB = {};

function loadData() {
    const savedDB = localStorage.getItem('zhongkuiUsersDB');
    if (savedDB) { usersDB = JSON.parse(savedDB); }
    
    const savedSession = localStorage.getItem('zhongkuiCurrentSession');
    if (savedSession && usersDB[savedSession]) {
        currentUser = savedSession;
        drawHistory = usersDB[currentUser].history || [];
        updateAuthUI();
    } else {
        drawHistory = []; // 未登录时为游客历史
    }
}

function saveData() { 
    if (currentUser) {
        usersDB[currentUser].history = drawHistory;
        localStorage.setItem('zhongkuiUsersDB', JSON.stringify(usersDB));
    } else {
        localStorage.setItem('zhongkuiGuestHistory', JSON.stringify({ history: drawHistory }));
    }
}

// function updateAuthUI() {
//     const loginBtn = document.getElementById('loginRouteBtn');
//     const userCenterBtn = document.getElementById('userCenterBtn');
//     const displayUserEl = document.getElementById('displayUsername');

//     if (currentUser) {
//         if(loginBtn) loginBtn.style.display = 'none';
//         if(userCenterBtn) userCenterBtn.style.display = 'block';
//         if(displayUserEl) displayUserEl.textContent = currentUser;
//     } else {
//         if(loginBtn) loginBtn.style.display = 'block';
//         if(userCenterBtn) userCenterBtn.style.display = 'none';
//     }
// }

function updateAuthUI() {
            const loginBtn = document.getElementById('loginRouteBtn');
            const userCenterBtn = document.getElementById('userCenterBtn');
            const dispName = document.getElementById('displayUsername');

            if (currentUser) {
                if(loginBtn) loginBtn.style.display = 'none';
                if(userCenterBtn) userCenterBtn.style.display = 'block';
                if(dispName) dispName.textContent = currentUser;
            } else {
                if(loginBtn) loginBtn.style.display = 'block';
                if(userCenterBtn) userCenterBtn.style.display = 'none';
            }
        }

function handleLogin() {
    const user = document.getElementById('usernameInput')?.value.trim();
    const pass = document.getElementById('passwordInput')?.value;
    const msg = document.getElementById('loginMessage');
    
    if (!user || !pass) { if(msg) msg.textContent = "账号法印不可为空"; return; }
    if (!usersDB[user]) { if(msg) msg.textContent = "查无此尊号，请先结缘注册"; return; }
    if (usersDB[user].password !== pass) { if(msg) msg.textContent = "法印错误，难启法门"; return; }
    
    currentUser = user;
    drawHistory = usersDB[user].history || [];
    localStorage.setItem('zhongkuiCurrentSession', user);
    
    if(document.getElementById('usernameInput')) document.getElementById('usernameInput').value = '';
    if(document.getElementById('passwordInput')) document.getElementById('passwordInput').value = '';
    if(msg) msg.textContent = '';
    
    updateAuthUI();
    showPage('userCenterPage');
}

function handleRegister() {
    const user = document.getElementById('usernameInput')?.value.trim();
    const pass = document.getElementById('passwordInput')?.value;
    const msg = document.getElementById('loginMessage');
    
    if (!user || !pass) { if(msg) msg.textContent = "账号法印不可为空"; return; }
    if (usersDB[user]) { if(msg) msg.textContent = "此尊号已被占用"; return; }
    
    usersDB[user] = { password: pass, history: [], hasAddedWeChat: false };
    localStorage.setItem('zhongkuiUsersDB', JSON.stringify(usersDB));
    if(msg) {
        msg.style.color = '#d4af37';
        msg.textContent = "结缘成功，请登堂入室";
    }
}

function handleLogout() {
    currentUser = null;
    drawHistory = [];
    localStorage.removeItem('zhongkuiCurrentSession');
    updateAuthUI();
    showPage('homePage');
}

function handleVerifyWeChat() {
    if(currentUser && usersDB[currentUser]) {
        usersDB[currentUser].hasAddedWeChat = true;
        saveData();
        document.getElementById('wechatUnlockModal')?.classList.remove('active');
        startDrawProcess();
    }
}

function closeWechatModal() {
    const modalEl = document.getElementById('wechatUnlockModal');
    if(modalEl) modalEl.classList.remove('active');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
}

function showModal(title, message, confirmCallback) {
    if(document.getElementById('modalTitle')) document.getElementById('modalTitle').textContent = title;
    if(document.getElementById('modalMessage')) document.getElementById('modalMessage').textContent = message;
    const modalEl = document.getElementById('modal');
    if(modalEl) modalEl.classList.add('active');

    const confirmBtn = document.getElementById('modalConfirm');
    if(confirmBtn) {
        confirmBtn.onclick = () => {
            if(modalEl) modalEl.classList.remove('active');
            if (confirmCallback) confirmCallback();
        };
    }
    const cancelBtn = document.getElementById('modalCancel');
    if(cancelBtn) cancelBtn.onclick = () => modalEl?.classList.remove('active');
}

function judgeYao(coins) {
    const backCount = coins.filter(c => !c).length;
    if (backCount === 3) return { type: 'yin', isDong: true, name: '老阴' };
    if (backCount === 0) return { type: 'yang', isDong: true, name: '老阳' };
    if (backCount === 2) return { type: 'yang', isDong: false, name: '少阳' };
    return { type: 'yin', isDong: false, name: '少阴' };
}

function calculateGuaFromYao(yaoArray) {
    const guaName = findGuaName(yaoArray);
    const guaIndex = STANDARD_GUA.findIndex(g => g.name === guaName);
    return guaIndex !== -1 ? guaIndex : 0;
}

function getMainGua() {
    if (yaoResults.length === 0) return SIXTY_FOUR_GUA[1];
    const index = calculateGuaFromYao(yaoResults);
    return SIXTY_FOUR_GUA[index] || SIXTY_FOUR_GUA[1];
}

function getDongYaoIndices() { 
    return yaoResults.map((yao, i) => yao.isDong ? i : -1).filter(i => i !== -1); 
}

function generateGuaReading() {
    const mainGua = getMainGua();
    const changedGua = getChangedGua();
    const dongYaoIndices = getDongYaoIndices();
    const standardGua = STANDARD_GUA.find(g => g.name === mainGua.name);
    const text = standardGua ? standardGua.text : mainGua.originalText || '';
    const comment = standardGua ? standardGua.comment : '';

    const yaoPositions = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    const validDongYaoPositions = dongYaoIndices.map(i => yaoPositions[i]).filter(pos => pos);

    let interpretation = '';
    if (dongYaoIndices.length === 0) {
        interpretation = `<div class="gua-section"><div class="gua-title">【本卦：${mainGua.name}】</div><div class="gua-text-content">${text}</div><div class="gua-comment">${comment}</div><div class="gua-tip" style="color:#d4af37; border-top:1px dashed #6b4c05; padding-top:10px; margin-top:10px;">★ 司命批语：卦象沉稳无变，所问之事宜顺应天时，静待其成。</div></div>`;
    } else {
        let dongYaoText = validDongYaoPositions.length === 1 
            ? `<div class="dongyao-section"><div class="dongyao-title" style="color:#8b1d1d; font-size:1.1rem;">【${validDongYaoPositions[0]} 暗动】</div><div class="dongyao-content" style="color:#e5d3b3;">运势暗藏转机，需慧眼识时，顺势而为方免祸殃。</div></div>`
            : `<div class="dongyao-section"><div class="dongyao-title" style="color:#8b1d1d; font-size:1.1rem;">【群爻竞发】</div><div class="dongyao-content" style="color:#e5d3b3;">事态扑朔迷离，变数颇多，宜随机应变，切忌执念。</div></div>`;

        interpretation = `<div class="gua-section"><div class="gua-title">【本卦：${mainGua.name}】</div><div class="gua-text-content">${text}</div><div class="gua-comment">${comment}</div></div>${dongYaoText}`;

        if (changedGua) {
            const changedStandard = STANDARD_GUA.find(g => g.name === changedGua.name);
            const changedText = changedStandard ? changedStandard.text : changedGua.text || '';
            const changedComment = changedStandard ? changedStandard.comment : changedGua.comment || '';
            interpretation += `<div class="gua-section"><div class="gua-title">【变卦：${changedGua.name}】</div><div class="gua-text-content">${changedText}</div><div class="gua-comment">${changedComment}</div></div>`;
        }
    }

    return { mainGua, changedGua, dongYaoIndices, interpretation };
}

function getChangedGua() {
    const dongYaoIndices = getDongYaoIndices();
    if (dongYaoIndices.length === 0) return null;
    const changedYaoArray = generateChangedYao(yaoResults);
    const changedGuaName = findGuaName(changedYaoArray);
    return SIXTY_FOUR_GUA.find(g => g.name === changedGuaName) || null;
}

function displayGua(guaReading) {
    const { mainGua, changedGua, dongYaoIndices } = guaReading;
    const mainGuaName = findGuaName(yaoResults);
    if(document.getElementById('mainGuaName')) document.getElementById('mainGuaName').textContent = mainGuaName;

    const hasChange = dongYaoIndices.length > 0 && changedGua;
    const changedGuaPair = document.getElementById('changedGuaPair');
    if(changedGuaPair) changedGuaPair.style.display = hasChange ? 'flex' : 'none';

    const mainCardImage = document.getElementById('mainCardImage');
    const changedCardImage = document.getElementById('changedCardImage');
    
    const mainGuaData = STANDARD_GUA.find(g => g.name === mainGuaName);
    if(mainCardImage) mainCardImage.src = (mainGuaData && mainGuaData.imagePath) ? mainGuaData.imagePath : 'cards/卡片.webp';
    
    if (hasChange && changedCardImage) {
        const changedGuaData = STANDARD_GUA.find(g => g.name === changedGua.name);
        changedCardImage.src = (changedGuaData && changedGuaData.imagePath) ? changedGuaData.imagePath : 'cards/卡片.webp';
    }

    const mainText = guaReading.mainGua?.text || '';
    const mainComment = guaReading.mainGua?.comment || '';
    if(document.getElementById('mainGuaText')) document.getElementById('mainGuaText').textContent = `${mainText}\n${mainComment}`;

    const mainYaoDisplay = document.getElementById('mainYaoDisplay');
    if(mainYaoDisplay) {
        mainYaoDisplay.querySelectorAll('.yao-row').forEach((row, index) => {
            const yaoSymbol = row.querySelector('.yao-symbol');
            const dongIndicator = row.querySelector('.dong-indicator');
            const yaoIndex = 5 - index; const yao = yaoResults[yaoIndex];
            if (yao && yaoSymbol) {
                yaoSymbol.className = `yao-symbol yao-${yao.type}`;
                if (yao.isDong && dongIndicator) {
                    dongIndicator.className = `dong-indicator dong-${yao.type}`;
                    dongIndicator.textContent = yao.type === 'yang' ? '○' : '×';
                } else if(dongIndicator) { 
                    dongIndicator.className = 'dong-indicator'; dongIndicator.textContent = ''; 
                }
            }
        });
    }

    const changedGuaSection = document.getElementById('changedGuaSection');
    if (hasChange && changedGuaSection) {
        changedGuaSection.style.display = 'block';
        if(document.getElementById('changedGuaName')) document.getElementById('changedGuaName').textContent = changedGua.name;
        const changedStandardGua = STANDARD_GUA.find(g => g.name === changedGua.name);
        const changedText = changedStandardGua ? changedStandardGua.text : '';
        const changedComment = changedStandardGua ? changedStandardGua.comment : '';
        if(document.getElementById('changedGuaText')) document.getElementById('changedGuaText').textContent = `${changedText}\n${changedComment}`;

        const changedYaoArray = generateChangedYao(yaoResults);
        const changedYaoDisplay = document.getElementById('changedYaoDisplay');
        if(changedYaoDisplay) {
            changedYaoDisplay.querySelectorAll('.yao-row').forEach((row, index) => {
                const yaoSymbol = row.querySelector('.yao-symbol');
                const yaoIndex = 5 - index; const yao = changedYaoArray[yaoIndex];
                if (yao && yaoSymbol) yaoSymbol.className = `yao-symbol yao-${yao.type}`;
            });
        }
    } else if(changedGuaSection) {
        changedGuaSection.style.display = 'none';
        if(document.getElementById('changedGuaName')) document.getElementById('changedGuaName').textContent = '';
        if(document.getElementById('changedGuaText')) document.getElementById('changedGuaText').textContent = '';
    }

    const dongyaoInfo = document.getElementById('dongyaoInfo');
    const positions = dongYaoIndices.map(i => ['初爻','二爻','三爻','四爻','五爻','上爻'][i]).join('、');
    if(dongyaoInfo) {
        dongyaoInfo.style.display = positions ? 'block' : 'none';
        if(document.getElementById('dongyaoText')) document.getElementById('dongyaoText').textContent = positions ? `${positions} 显象` : '';
    }
}

function showResult() {
    const guaReading = generateGuaReading();
    if(document.getElementById('resultQuestionText')) document.getElementById('resultQuestionText').textContent = selectedQuestion || '';
    displayGua(guaReading);
    if(document.getElementById('cardAnalysis')) document.getElementById('cardAnalysis').innerHTML = guaReading.interpretation;
    
    drawHistory.unshift({
        guaName: guaReading.mainGua.name, category: selectedCategory,
        question: selectedQuestion, reading: guaReading.interpretation,
        timestamp: new Date().toLocaleString('zh-CN'),
        yaoResults: [...yaoResults], dongYaoIndices: guaReading.dongYaoIndices
    });
    if (drawHistory.length > 50) drawHistory = drawHistory.slice(0, 50);

    if (!currentUser) {
        hasUsedTrial = true;
        localStorage.setItem('zhongkuiHasUsedTrial', 'true');
    }

    saveData();
    showPage('resultPage');
    
    if(currentInteractionMode === 'gesture') {
        startMagicParticles();
    }
}

function tossCoins() {
    if (throwCount >= 6) return;

    const tossBtn = document.getElementById('tossBtn');
    if (tossBtn) tossBtn.disabled = true;
    if(document.getElementById('currentThrowResult')) document.getElementById('currentThrowResult').style.display = 'none';
    
    setTimeout(() => {
        const results = [Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5];
        const yao = judgeYao(results);
        yaoResults.push(yao);
        
        const resultEls = ['currentResult1', 'currentResult2', 'currentResult3'];
        resultEls.forEach((elId, idx) => {
            const el = document.getElementById(elId);
            if(el) {
                el.textContent = ''; 
                el.className = `result-item ${results[idx] ? 'front' : 'back'}`;
            }
        });
        
        const yaoResEl = document.getElementById('yaoResult');
        if(yaoResEl) {
            yaoResEl.textContent = yao.name;
            yaoResEl.style.color = yao.isDong ? '#d4af37' : '#c9bda5';
        }
        if(document.getElementById('currentThrowResult')) document.getElementById('currentThrowResult').style.display = 'block';
        
        const yaoCell = document.getElementById(`yao${throwCount}`);
        if (yaoCell) {
            let yaoEl = yaoCell.querySelector('.yao-symbol');
            let indicatorEl = yaoCell.querySelector('.dong-indicator');
            if(yaoEl) yaoEl.className = `yao-symbol yao-${yao.type}`;
            if (yao.isDong && indicatorEl) {
                indicatorEl.className = `dong-indicator dong-${yao.type}`;
                indicatorEl.textContent = yao.type === 'yang' ? '○' : '×';
            }
        }
        
        throwCount++;
        if(document.getElementById('throwCount')) document.getElementById('throwCount').textContent = String(throwCount);
        
        if (throwCount >= 6) {
            const preReading = generateGuaReading();
            const mainData = STANDARD_GUA.find(g => g.name === preReading.mainGua.name);
            if (mainData && mainData.imagePath) { new Image().src = mainData.imagePath; }
            if (preReading.changedGua) {
                const changedData = STANDARD_GUA.find(g => g.name === preReading.changedGua.name);
                if (changedData && changedData.imagePath) { new Image().src = changedData.imagePath; }
            }

            setTimeout(() => {
                if (currentInteractionMode === 'gesture') {
                    gestureState = 'sword';
                    updateGestureHint('请捏剑指（食中二指并拢直立）以开法眼');
                    if(document.getElementById('coinsStage')) document.getElementById('coinsStage').style.display = 'none';
                } else {
                    if(document.getElementById('coinsStage')) document.getElementById('coinsStage').style.display = 'none';
                    showResult();
                }
            }, 800);
        } else {
            if (currentInteractionMode === 'gesture') {
                setTimeout(() => {
                    if(gestureState === 'toss') updateGestureHint(`请握拳后张开，投掷金钱 (第 ${throwCount + 1} 掷)`);
                }, 500);
            }
            if (tossBtn) tossBtn.disabled = false; 
        }
    }, 500);
}

function resetDrawState() {
    throwCount = 0; yaoResults = []; isFistDetected = false; wristHistory = [];
    currentCardScale = 1.0; targetCardScale = 1.0;
    
    if(document.getElementById('questionSelectionStage')) document.getElementById('questionSelectionStage').style.display = 'block';
    if(document.getElementById('clickStage')) document.getElementById('clickStage').style.display = 'none';
    if(document.getElementById('coinsStage')) document.getElementById('coinsStage').style.display = 'none';
    if(document.getElementById('tortoiseStage')) document.getElementById('tortoiseStage').style.display = 'none';
    if(document.getElementById('hexagramStage')) document.getElementById('hexagramStage').style.display = 'none';
    if(document.getElementById('currentThrowResult')) document.getElementById('currentThrowResult').style.display = 'none';
    if(document.getElementById('throwCount')) document.getElementById('throwCount').textContent = '0';
    if(document.getElementById('tortoiseClickHint')) document.getElementById('tortoiseClickHint').style.display = currentInteractionMode === 'gesture' ? 'none' : 'block';
    if(document.getElementById('silentGestureHint')) document.getElementById('silentGestureHint').style.display = 'none';
    
    const tossBtn = document.getElementById('tossBtn');
    if (tossBtn) {
        tossBtn.style.display = currentInteractionMode === 'gesture' ? 'none' : 'inline-block';
        tossBtn.disabled = false; 
    }

    document.querySelectorAll('.coin').forEach(coin => coin.classList.remove('throwing'));
    document.querySelectorAll('.result-item').forEach(item => { item.textContent = ''; item.className = 'result-item'; });
    document.querySelectorAll('.yao-symbol').forEach(yao => { yao.className = 'yao-symbol yao-empty'; });
    document.querySelectorAll('.dong-indicator').forEach(indicator => { indicator.className = 'dong-indicator'; indicator.textContent = ''; });
    
    document.querySelectorAll('.card-placeholder').forEach(card => {
        card.style.transform = `scale(1.0)`;
        card.classList.remove('glowing');
    });

    stopMagicParticles();
    stopGestureCamera();
}

function startDrawProcess() {
    resetDrawState();
    if(document.getElementById('questionSelectionStage')) document.getElementById('questionSelectionStage').style.display = 'none';
    if(document.getElementById('clickStage')) document.getElementById('clickStage').style.display = 'block';
    if(document.getElementById('tortoiseStage')) document.getElementById('tortoiseStage').style.display = 'block';
    if (currentInteractionMode === 'gesture' && document.getElementById('gestureContainer')) { 
        document.getElementById('gestureContainer').style.display = 'block'; 
        startGestureCamera(); 
    }
}

/* ================= 魔法粒子系统 ================= */
let magicCtx = null;
let magicParticles = [];
let magicAnimFrameId = null;

function initMagicCanvas() {
    const canvas = document.getElementById('magicCanvas');
    if(!canvas) return;
    magicCtx = canvas.getContext('2d');
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
}

class MagicParticle {
    constructor(x, y, colorStr) {
        this.x = x; 
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5 - 1.5; 
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
        this.size = Math.random() * 3 + 1.5;
        this.color = colorStr || '212, 175, 55'; 
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life -= this.decay;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.life})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(${this.color}, ${this.life})`;
        ctx.fill();
    }
}

function startMagicParticles() {
    const canvas = document.getElementById('magicCanvas');
    if(!canvas) return;
    canvas.style.display = 'block';
    magicParticles = [];
    if(!magicAnimFrameId) animateMagic();
}

function stopMagicParticles() {
    const canvas = document.getElementById('magicCanvas');
    if(canvas) canvas.style.display = 'none';
    if (magicAnimFrameId) { cancelAnimationFrame(magicAnimFrameId); magicAnimFrameId = null; }
}

function animateMagic() {
    if (gestureState !== 'result_zoom' || !magicCtx) return;
    magicCtx.clearRect(0, 0, magicCtx.canvas.width, magicCtx.canvas.height);

    currentCardScale += (targetCardScale - currentCardScale) * 0.15;
    const cards = document.querySelectorAll('.card-placeholder');
    cards.forEach(card => {
        card.style.transform = `scale(${currentCardScale.toFixed(3)})`;
        if (currentCardScale > 1.1) { card.classList.add('glowing'); }  
        else { card.classList.remove('glowing'); }
    });

    for (let i = magicParticles.length - 1; i >= 0; i--) {
        const p = magicParticles[i];
        p.update(); p.draw(magicCtx);
        if (p.life <= 0) magicParticles.splice(i, 1);
    }

    magicAnimFrameId = requestAnimationFrame(animateMagic);
}

/* ================= MediaPipe 手势识别及缩放逻辑 ================= */
const videoElement = document.getElementById('gestureVideo');
const canvasElement = document.getElementById('gestureCanvas');
const canvasCtx = canvasElement?.getContext('2d');

function updateGestureHint(text) { 
    if(document.getElementById('gestureHint')) document.getElementById('gestureHint').textContent = text; 
}

function initHands() {
    if (mpHands || !typeof Hands === 'function') return;
    mpHands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    mpHands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
    mpHands.onResults(onHandResults);
}

async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (err) {
        alert("凌空演卦需借法眼(摄像头)，请在系统设置中赐予权限。");
        return false;
    }
}

async function startGestureCamera() {
    if(!videoElement) return;
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
        setMode('click'); 
        return; 
    }
    initHands();
    gestureState = 'shake';
    updateGestureHint('请握拳并左右摇晃，唤醒灵龟');
    
    if (!mpCamera && typeof Camera === 'function') {
        mpCamera = new Camera(videoElement, {
            onFrame: async () => { await mpHands.send({image: videoElement}); },
            width: 320, height: 240
        });
    }
    mpCamera?.start();
}

function stopGestureCamera() {
    if (mpCamera) { mpCamera.stop(); mpCamera = null; } 
    if(document.getElementById('gestureContainer')) document.getElementById('gestureContainer').style.display = 'none';
    if(document.getElementById('silentGestureHint')) document.getElementById('silentGestureHint').style.display = 'none';
}

function triggerShake() {
    const shell = document.getElementById('tortoiseShell');
    if(!shell) return;
    shell.classList.add('shaking');
    setTimeout(() => {
        shell.classList.remove('shaking');
        if(document.getElementById('tortoiseStage')) document.getElementById('tortoiseStage').style.display = 'none';
        if(document.getElementById('coinsStage')) document.getElementById('coinsStage').style.display = 'block';
        if(document.getElementById('hexagramStage')) document.getElementById('hexagramStage').style.display = 'block';
        gestureState = 'toss';
        isFistDetected = false; 
        updateGestureHint('请握拳后张开，投掷金钱 (第 1 掷)');
    }, 600);
}

function getDistance(p1, p2) { return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)); }
function isFingerExtended(landmarks, tipIdx, pipIdx) { return getDistance(landmarks[tipIdx], landmarks[0]) > getDistance(landmarks[pipIdx], landmarks[0]); }

function onHandResults(results) {
    if (!canvasCtx || !canvasElement) return;

    if (gestureState === 'result_zoom') {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const thumb = landmarks[4];
            const index = landmarks[8];
            const pinchDist = getDistance(thumb, index);
            
            let newTargetScale = 1.0;
            if (pinchDist > 0.05) {
                newTargetScale = 1.0 + (pinchDist - 0.05) * 3.5;
                newTargetScale = Math.min(newTargetScale, 1.6);
            }
            targetCardScale = newTargetScale;

            if (targetCardScale > 1.15) {
                const px = (1 - ((thumb.x + index.x) / 2)) * window.innerWidth; 
                const py = ((thumb.y + index.y) / 2) * window.innerHeight;
                const particleColor = targetCardScale > 1.4 ? '139, 29, 29' : '212, 175, 55';
                for(let i=0; i<3; i++) {
                    magicParticles.push(new MagicParticle(px, py, particleColor));
                }
            }
        } else {
            targetCardScale = 1.0;
        }
        return;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        if(typeof drawConnectors === 'function') drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#d4af37', lineWidth: 2});  
        if(typeof drawLandmarks === 'function') drawLandmarks(canvasCtx, landmarks, {color: '#8b1d1d', lineWidth: 1, radius: 2}); 

        if (gestureCooldown) { canvasCtx.restore(); return; }

        const indexOpen = isFingerExtended(landmarks, 8, 6);
        const middleOpen = isFingerExtended(landmarks, 12, 10);
        const ringOpen = isFingerExtended(landmarks, 16, 14);
        const pinkyOpen = isFingerExtended(landmarks, 20, 18);

        const isFist = !indexOpen && !middleOpen && !ringOpen && !pinkyOpen;
        const isOpen = indexOpen && middleOpen && ringOpen && pinkyOpen;
        const isSword = indexOpen && middleOpen && !ringOpen && !pinkyOpen;

        if (gestureState === 'shake') {
            if (isFist) {
                wristHistory.push({x: landmarks[0].x, y: landmarks[0].y});
                if (wristHistory.length > 15) wristHistory.shift(); 
                if (wristHistory.length > 5) {
                    const xs = wristHistory.map(p => p.x); const ys = wristHistory.map(p => p.y);
                    const movement = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
                    if (movement > 0.06) { 
                        triggerShake(); gestureCooldown = true; setTimeout(() => { gestureCooldown = false; }, 1000); wristHistory = [];
                    }
                }
            } else { wristHistory = []; }
        } else if (gestureState === 'toss') {
            if (isFist && !isFistDetected) {
                isFistDetected = true; updateGestureHint(`已握拳，请用力张开手掌 (第 ${throwCount + 1} 掷)`);
            } else if (isOpen && isFistDetected) {
                tossCoins(); isFistDetected = false; gestureCooldown = true; updateGestureHint('掷钱中...'); setTimeout(() => { gestureCooldown = false; }, 1500); 
            }
        } else if (gestureState === 'sword') {
            if (isSword) {
                if(document.getElementById('gestureContainer')) document.getElementById('gestureContainer').style.display = 'none';
                gestureState = 'result_zoom'; 
                if(document.getElementById('silentGestureHint')) document.getElementById('silentGestureHint').style.display = 'block';
                showResult(); 
            }
        }
    }
    canvasCtx.restore();
}

/* ================= 绑定事件区 ================= */
function initQuestionLibrary() {
    const categoriesContainer = document.getElementById('questionCategories');
    if(!categoriesContainer) return;

    const categories = Object.keys(QUESTION_LIBRARY);
    categoriesContainer.innerHTML = categories.map(cat => `<button class="category-btn" data-category="${cat}">${cat}</button>`).join('');
    categoriesContainer.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => selectCategory(btn.dataset.category));
    });
    if (categories.length > 0) selectCategory(categories[0]);
    
    document.getElementById('startTossBtn')?.addEventListener('click', () => {
        if (!selectedQuestion) return;

        if (currentUser) {
            if (usersDB[currentUser]?.hasAddedWeChat === undefined || usersDB[currentUser]?.hasAddedWeChat === false) {
                document.getElementById('wechatUnlockModal')?.classList.add('active');
                return;
            }
        } else {
            if (hasUsedTrial) {
                showModal('法力耗尽', '道友，单次试玩机缘已尽。请登堂入室（登录）并结缘官方，解锁无限机缘。', () => {
                    showPage('loginPage');
                });
                return;
            }
        }
        startDrawProcess();
    });
}

function selectCategory(category) {
    selectedCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.category-btn[data-category="${category}"]`);
    if(activeBtn) activeBtn.classList.add('active');

    const questionList = document.getElementById('questionList');
    if(!questionList) return;

    if (category === '诚心一问') {
        questionList.innerHTML = '<p style="text-align: center; color: #a99a80; padding: 20px;">随心而问，神灵鉴之</p>';
        selectedQuestion = '诚心一问（无定类）';
    } else {
        questionList.innerHTML = QUESTION_LIBRARY[category].map(q => `<div class="question-item" data-question="${q}">${q}</div>`).join('');
        questionList.querySelectorAll('.question-item').forEach(item => { 
            item.addEventListener('click', () => selectQuestion(item.dataset.question)); 
        });
        selectedQuestion = null;
    }
    updateSelectedQuestion();
}

function selectQuestion(question) {
    selectedQuestion = question;
    document.querySelectorAll('.question-item').forEach(item => item.classList.remove('selected'));
    const targetItem = document.querySelector(`.question-item[data-question="${question}"]`);
    if(targetItem) targetItem.classList.add('selected');
    updateSelectedQuestion();
}

function updateSelectedQuestion() {
    const selectedContainer = document.getElementById('selectedQuestion');
    const selectedText = document.getElementById('selectedQuestionText');
    const startBtn = document.getElementById('startTossBtn');

    if (selectedQuestion) { 
        if(selectedContainer) selectedContainer.classList.add('show'); 
        if(selectedText) selectedText.textContent = selectedQuestion === '诚心一问（无定类）' ? '随心而问，心诚则灵' : selectedQuestion; 
        if(startBtn) startBtn.disabled = false; 
    } else { 
        if(selectedContainer) selectedContainer.classList.remove('show'); 
        if(startBtn) startBtn.disabled = true; 
    }
}

function renderHistory() {
    const list = document.getElementById('historyList'); 
    const clearBtn = document.getElementById('clearHistoryBtn');
    if(!list) return;

    if (drawHistory.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #666; padding: 40px; font-size:1.1rem;">法卷空白，暂无所录</li>';
        if (clearBtn) clearBtn.style.display = 'none'; return;
    }
    if (clearBtn) clearBtn.style.display = 'block';
    list.innerHTML = drawHistory.map((item, index) => `
        <li class="history-item" data-index="${index}" onclick="toggleHistoryItem(${index})">
            <div class="history-header"><div style="display:flex; justify-content:space-between;"><span class="history-gua-name">${item.guaName}</span><span style="color:#6b4c05; font-size:0.9rem;">${item.timestamp}</span></div></div>
            <div style="color:#d4af37; font-size:0.9rem; margin-bottom:5px;">【${item.category}】</div>
            <div style="color:#e5d3b3; margin-bottom:10px;">${item.question}</div>
            <div class="history-reading" style="display:none; border-top:1px dashed #4a3018; padding-top:10px; margin-top:10px;">${item.reading}</div>
        </li>`).join('');
}

function toggleHistoryItem(index) { 
    const el = document.querySelector(`.history-item[data-index="${index}"] .history-reading`); 
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
}

/* ================= 页面初始化与防暴毙绑定 ================= */
window.addEventListener('DOMContentLoaded', () => { 
    loadData();
    initQuestionLibrary();
    initMagicCanvas();

    // 安全事件绑定区（全部穿上可选链防弹衣）
    document.getElementById('loginRouteBtn')?.addEventListener('click', () => showPage('loginPage'));
    document.getElementById('userCenterBtn')?.addEventListener('click', () => showPage('userCenterPage'));
    
    const openHistory = () => {
        if(!currentUser) { showModal('暂未登录', '您正以游客身份阅览，登录可永久保存您的问卦纪事。'); }
        renderHistory(); showPage('historyPage'); 
    };
    document.getElementById('historyBtn')?.addEventListener('click', openHistory);
    document.getElementById('historyBtn2')?.addEventListener('click', openHistory);

    document.getElementById('startDrawBtn')?.addEventListener('click', () => setMode('click'));
    document.getElementById('startGestureDrawBtn')?.addEventListener('click', () => setMode('gesture'));
    document.getElementById('drawAgainBtn')?.addEventListener('click', () => { resetDrawState(); showPage('drawPage'); });

    document.getElementById('backFromResultBtn')?.addEventListener('click', () => { resetDrawState(); showPage('homePage'); });
    document.getElementById('shareBtn')?.addEventListener('click', () => { document.getElementById('shareModal')?.classList.add('active'); });
    document.getElementById('shareModalClose')?.addEventListener('click', () => { document.getElementById('shareModal')?.classList.remove('active'); });
    document.getElementById('backFromDrawBtn')?.addEventListener('click', () => { resetDrawState(); showPage('homePage'); });
    document.getElementById('backFromHistoryBtn')?.addEventListener('click', () => { showPage('homePage'); });
    document.getElementById('backToHomeBtn')?.addEventListener('click', () => { showPage('homePage'); });
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => { 
        showModal('焚毁卦志', '确定要将过往天机尽数焚毁吗？此法不可逆转。', () => { drawHistory = []; saveData(); renderHistory(); }); 
    });
    document.getElementById('tortoiseShell')?.addEventListener('click', () => { if (currentInteractionMode === 'click') triggerShake(); });
    document.getElementById('tossBtn')?.addEventListener('click', tossCoins);
    
    document.querySelectorAll('.card-placeholder').forEach(card => {
        card.addEventListener('mouseenter', () => { if(currentInteractionMode === 'click') card.style.transform = `scale(1.05)`; });
        card.addEventListener('mouseleave', () => { if(currentInteractionMode === 'click') card.style.transform = `scale(1.0)`; });
    });
});

// 全局明面挂载（严苛的字符串字面量写法，严防JS打包/混淆器抹除变量名）
window['setMode'] = setMode;
window['showPage'] = showPage;
window['handleLogin'] = handleLogin;
window['handleRegister'] = handleRegister;
window['handleLogout'] = handleLogout;
window['handleVerifyWeChat'] = handleVerifyWeChat;
window['closeWechatModal'] = closeWechatModal;