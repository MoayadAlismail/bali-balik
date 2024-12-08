export default {
  // Home page
  title: "بالي بالك | تفكر باللي أفكر فيه؟",
  description: "لعبة جماعية مع أصدقائك أو عائلتك تونس الجلسة",
  createGame: "إنشاء لعبة جديدة",
  joinGame: "انضم للعبة",
  howToPlay: "كيف تلعب",
  gameExplanation: "اللعبة بسيطة وممتعة! 🎉 كل اللاعبين ياخذون نفس الموضوع، ومهمتهم إنهم يخمنون نفس الكلمة اللي تتعلق بالموضوع. مثلاً: لو كان الموضوع رياضة، اللاعبين يخمنون كرة القدم. كل ما زادت التخمينات المشتركة بين اللاعبين، زادت النقاط اللي يحصلونها. الفكرة إنكم تفكرون زي بعض وتدخلون جو! 😄",
  earlyAccess: "هذه نسخة ليست مكتملة! قد تظهر بعض الأخطاء 🚧",
  
  // Game setup
  enterName: "أدخل اسمك",
  enterPin: "أدخل رمز الغرفة",
  join: "انضم",
  create: "إنشاء",
  
  // Game states
  waiting: {
    roomCode: "رمز ��لغرفة: ",
    players: "اللاعبين:",
    playerCount: "عدد اللاعبين: ",
    you: "(أنت)",
    noPlayers: "لا يوجد لاعبين حتى الآن",
    start: "ابدأ"
  },
  
  // Playing state
  playing: {
    round: "الجولة",
    of: "من",
    secondsLeft: "ثواني باقية",
    topic: "الموضوع:",
    enterGuess: "أكتب تخمينك",
    submitGuess: "تقديم التخمين",
    guessSubmitted: "تم تقديم تخمينك! انتظار اللاعبين الآخرين...",
    whileWaiting: "بما إنك فاضي... ",
    submittedGuesses: "التخمينات المقدمة:",
    playersSubmitted: "لاعبين قدموا تخميناتهم"
  },
  
  // Round results
  roundResults: {
    roundComplete: "اكتملت الجولة",
    matchingGuesses: "التخمينات المتطابقة",
    allGuesses: "جميع التخمينات",
    currentStandings: "الترتيب الحالي",
    points: "نقطة"
  },
  
  // Game over
  gameOver: {
    gameEnded: "انتهت اللعبة!",
    congratulations: "🎉 مبروك",
    points: "نقطة",
    playAgain: "العب مرة ثانية 🎮",
    shareResults: "شارك النتائج 🔗",
    home: "الصفحة الرئيسية 🏠",
    shareText: "لعبت بالي بالك مع أصدقائي وفاز {winner} بـ {score} نقطة! 🎮✨\n\nالعب معنا:\nhttps://balibalik.com"
  },

  // Topics
  topics: {
    animals: "حيوانات",
    food: "طعام",
    sports: "رياضة",
    cities: "مدن",
    jobs: "مهن",
    colors: "ألوان",
    movies: "أفلام",
    celebrities: "مشاهير"
  },

  // Thikr messages
  thikr: [
    "قول سبحان الله",
    "قل لا اله إلا الله",
    "قول الحمدلله",
    "قول استغفر الله",    
    "صل على النبي"
  ],

  // Host page
  host: {
    title: "إنشاء لعبة جديدة",
    nameLabel: "اسمك",
    namePlaceholder: "أدخل اسمك",
    roundsLabel: "عدد الجولات",
    timeLabel: "وقت كل جولة (ثواني)",
    createButton: "إنشاء اللعبة",
    selectAvatar: "اختر شخصية",
    selectCharacter: "اختر شخصيتك",
    required: "مطلوب"
  },

  // Join page
  join: {
    title: "انضم للعبة",
    nameLabel: "اسمك",
    namePlaceholder: "أدخل اسمك",
    pinLabel: "رمز اللعبة",
    pinPlaceholder: "أدخل الرمز المكون من 4 أرقام",
    joinButton: "انضم للعبة",
    selectAvatar: "اختر شخصية",
    invalidPin: "رمز غير صحيح",
    required: "مطلوب"
  }
}; 