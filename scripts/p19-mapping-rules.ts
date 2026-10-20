/**
 * موتور طبقه‌بندی نگاشت حرکت → الگوی سه‌بعدی — مرحله ۱۹ (داده‌محور، نسخه‌پذیر).
 *
 * ورودی: داده واقعی هر حرکت از بانک (نام انگلیسی، تجهیزات، عضلات، نوع
 * تمرین، الگوی حرکتی، دسته). خروجی: شناسه الگو + پارامترها + مبانی نگاشت.
 *
 * قواعد طراحی:
 *  - دو حرکت فقط بر اساس نام مشابه هم‌ارز فرض نمی‌شوند؛ قواعد کلیدواژه با
 *    شواهد تجهیزات/الگو/نوع تمرین ترکیب می‌شوند.
 *  - هر قاعده basis می‌نویسد (مثلاً name:bench-press+equip:barbell) تا
 *    نگاشت قابل بازبینی باشد.
 *  - نگاشت دستی (MANUAL_OVERRIDES) بر همه قواعد مقدم است — برای حرکات
 *    ویژه‌ای که قاعده عمومی درست عمل نمی‌کند.
 *  - fallback آخرین لایه است: نزدیک‌ترین الگوی صادقانه بر اساس الگوی
 *    حرکتی/دسته، با basis «fallback:…» تا در گزارش قابل تفکیک باشد.
 */

export interface ClassifiableExercise {
  id: string;
  enName: string;
  category: string;
  pattern: string;
  exerciseType: string;
  equipment: string[];
  primaryMuscles: string[];
  compound: boolean | null;
}

export interface MappingResult {
  profileId: string;
  params: Record<string, string | number | boolean>;
  basis: string;
  confidence: "override" | "high" | "medium";
}

type Rule = {
  /** کلیدواژه‌های نام (lowercase، بریده‌شده با کلمه مرزی) */
  name: RegExp;
  /** شرط اختیاری روی تجهیزات/نوع/الگو/عضله */
  where?: (ex: ClassifiableExercise) => boolean;
  /** شرط منفی — جلوگیری از برخورد قواعد */
  not?: (ex: ClassifiableExercise) => boolean;
  out: MappingResult;
};

/* --------------------------- نگاشت‌های دستی --------------------------- */

/** حرکات ویژه — نگاشت صریح با دلیل مستند */
export const MANUAL_OVERRIDES: Record<string, MappingResult> = {
  // المپیک/کول‌محورهای پیچیده — ساده‌سازی صادقانه با الگوی هینج
  "fbd-advanced-kettlebell-windmill": {
    profileId: "hinge",
    params: { torso: 70, kneeBend: 10, load: "kettlebell" },
    basis: "override:kettlebell-windmill→hinge (hip hinge with rotation — simplified)",
    confidence: "override",
  },
  "fbd-kettlebell-windmill": {
    profileId: "hinge",
    params: { torso: 70, kneeBend: 10, load: "kettlebell" },
    basis: "override:kettlebell-windmill→hinge (hip hinge with rotation — simplified)",
    confidence: "override",
  },
  "fbd-double-kettlebell-windmill": {
    profileId: "hinge",
    params: { torso: 70, kneeBend: 10, load: "kettlebell" },
    basis: "override:double-kettlebell-windmill→hinge (simplified)",
    confidence: "override",
  },
  // پرس ایزومتریک روی دیوار
  "fbd-isometric-chest-squeezes": {
    profileId: "plank",
    params: { variant: "wall-sit" },
    basis: "override:isometric-chest-squeeze→wall-sit hold (isometric)",
    confidence: "override",
  },
  // حرکات تعادلی — نگه‌داشتن ایستاده
  "fbd-balance-board": {
    profileId: "plank",
    params: { variant: "wall-sit" },
    basis: "override:balance→static standing hold (isometric)",
    confidence: "override",
  },
  "fbd-downward-facing-balance": {
    profileId: "static-stretch",
    params: { variant: "standing-forward" },
    basis: "override:single-leg forward balance→standing forward-fold hold",
    confidence: "override",
  },
  // پرش‌های عمق — الگوی پرش عمودی
  "fbd-incline-push-up-depth-jump": {
    profileId: "plyo",
    params: { variant: "vertical-jump" },
    basis: "override:depth-jump→vertical-jump (simplified)",
    confidence: "override",
  },
  // درگ‌های تجهیزات سنگین
  "fbd-backward-drag": {
    profileId: "strongman",
    params: { variant: "drag" },
    basis: "override:backward-drag→strongman-drag",
    confidence: "override",
  },
  "fbd-bear-crawl-sled-drags": {
    profileId: "strongman",
    params: { variant: "drag" },
    basis: "override:sled-drag→strongman-drag",
    confidence: "override",
  },
  // تمرین با طناب مبارزه‌ای — موج دست‌ها
  "fbd-battling-ropes": {
    profileId: "cardio",
    params: { variant: "shadow-box" },
    basis: "override:battle-ropes→arm-wave pattern (bag-less punch display)",
    confidence: "override",
  },
  // حرکات ترکیبی ویژه
  "fbd-crucifix": {
    profileId: "raise",
    params: { direction: "lateral", load: "dumbbells" },
    basis: "override:crucifix→lateral-raise pattern",
    confidence: "override",
  },
  "fbd-crossover-reverse-lunge": {
    profileId: "lunge",
    params: { direction: "back", load: "none" },
    basis: "override:crossover-reverse-lunge→reverse lunge",
    confidence: "override",
  },
  "fbd-pelvic-tilt-into-bridge": {
    profileId: "hip-thrust",
    params: { elevated: "floor", load: "none", singleLeg: "no" },
    basis: "override:pelvic-tilt-into-bridge→glute bridge",
    confidence: "override",
  },
  "fbd-standing-pelvic-tilt": {
    profileId: "plank",
    params: { variant: "wall-sit" },
    basis: "override:standing-pelvic-tilt→standing hold (isometric)",
    confidence: "override",
  },
  "fbd-stomach-vacuum": {
    profileId: "plank",
    params: { variant: "hollow" },
    basis: "override:stomach-vacuum→hollow hold (isometric ab brace)",
    confidence: "override",
  },
  "fbd-lower-back-curl": {
    profileId: "plank",
    params: { variant: "superman" },
    basis: "override:lower-back-curl→prone back extension hold",
    confidence: "override",
  },
  "fbd-torso-rotation": {
    profileId: "crunch",
    params: { variant: "twist" },
    basis: "override:torso-rotation→seated twist",
    confidence: "override",
  },
  "fbd-otis-up": {
    profileId: "floor-press",
    params: { load: "dumbbells" },
    basis: "override:otis-up→floor press pattern",
    confidence: "override",
  },
  "fbd-bottoms-up": {
    profileId: "overhead-press",
    params: { position: "standing", load: "kettlebell" },
    basis: "override:bottoms-up→kettlebell press",
    confidence: "override",
  },
  "fbd-neck-press": {
    profileId: "bench-press",
    params: { angle: "flat", load: "barbell" },
    basis: "override:neck-press (guillotine)→bench press",
    confidence: "override",
  },
  "fbd-svend-press": {
    profileId: "fly",
    params: { position: "standing", load: "dumbbells" },
    basis: "override:svend-press→standing chest squeeze fly",
    confidence: "override",
  },
  "fbd-cuban-press": {
    profileId: "shoulder-rotation",
    params: { variant: "raise-overhead", load: "dumbbells" },
    basis: "override:cuban-press→raise-rotate-press hybrid (simplified)",
    confidence: "override",
  },
  "fbd-kneeling-squat": {
    profileId: "hip-thrust",
    params: { elevated: "bench", load: "none", singleLeg: "no" },
    basis: "override:kneeling-squat→hip thrust pattern",
    confidence: "override",
  },
  "farmers-walk": {
    profileId: "strongman",
    params: { variant: "carry" },
    basis: "override:farmers-walk→loaded carry",
    confidence: "override",
  },
  "fbd-lying-face-down-plate-neck-resistance": {
    profileId: "plank",
    params: { variant: "superman" },
    basis: "override:prone neck extension→superman hold (simplified)",
    confidence: "override",
  },
  "fbd-lying-face-up-plate-neck-resistance": {
    profileId: "crunch",
    params: { variant: "crunch" },
    basis: "override:supine neck flexion→crunch pattern (simplified)",
    confidence: "override",
  },
  "fbd-seated-head-harness-neck-resistance": {
    profileId: "crunch",
    params: { variant: "crunch" },
    basis: "override:seated neck flexion→flexion pattern (simplified)",
    confidence: "override",
  },
  "fbd-body-up": {
    profileId: "pull-up",
    params: { grip: "neutral", assisted: "no" },
    basis: "override:body-up→vertical pull",
    confidence: "override",
  },
  "fbd-pike-push-up": {
    profileId: "push-up",
    params: { angle: "decline", width: "narrow" },
    basis: "override:pike-push-up→decline push-up (shoulder-biased)",
    confidence: "override",
  },
};

/**
 * قواعد کلیدواژه‌ای سراسری — قبل از تقسیم بر نوع تمرین اجرا می‌شوند.
 * فقط برای نام‌های کاملاً مشخص و بدون برخورد (با lookahead محافظت‌شده).
 */
export const SPECIAL_NAME_RULES: Rule[] = [
  { name: /pike push/, out: { profileId: "push-up", params: { angle: "decline", width: "narrow" }, basis: "name:pike-push-up→decline push-up", confidence: "high" } },
  { name: /butterfly/, out: { profileId: "fly", params: { position: "standing", load: "machine" }, basis: "name:butterfly→pec-deck fly", confidence: "high" } },
  { name: /shrug/, out: { profileId: "shrug", params: { load: "barbell" }, basis: "name:shrug→shrug", confidence: "high" } },
  { name: /reverse curl/, out: { profileId: "curl", params: { variant: "standing", load: "dumbbells" }, basis: "name:reverse-curl→curl (overhand)", confidence: "high" } },
  { name: /curl.*(incline|bench)|incline bench.*curl/, out: { profileId: "curl", params: { variant: "incline", load: "dumbbells" }, basis: "name:curl-over-incline→incline curl", confidence: "high" } },
  { name: /clean and press|kettlebell dead clean|hang clean|clean(?!.*grip)/, out: { profileId: "olympic", params: { variant: "clean" }, basis: "name:clean-family→olympic clean", confidence: "high" } },
  { name: /jerk|snatch/, out: { profileId: "olympic", params: { variant: "jerk" }, basis: "name:jerk/ snatch→olympic", confidence: "high" } },
  { name: /high pull\b/, out: { profileId: "olympic", params: { variant: "high-pull" }, basis: "name:high-pull→olympic", confidence: "high" } },
  { name: /swing|sledgehammer|figure 8|pass between the legs|spell caster/, out: { profileId: "olympic", params: { variant: "swing" }, basis: "name:swing-family→kettlebell swing", confidence: "high" } },
  { name: /slam/, out: { profileId: "plyo", params: { variant: "slam" }, basis: "name:slam→ball slam", confidence: "high" } },
  { name: /sprint/, out: { profileId: "plyo", params: { variant: "sprint" }, basis: "name:sprint→sprint drill", confidence: "high" } },
  { name: /jump squat|squat jump|kneeling jump/, out: { profileId: "plyo", params: { variant: "tuck-jump" }, basis: "name:jump-squat→plyo jump", confidence: "high" } },
  { name: /bicycl|air bike/, out: { profileId: "cardio", params: { variant: "pedal" }, basis: "name:cycling→seated pedal", confidence: "high" } },
  { name: /cross ?over/, out: { profileId: "fly", params: { position: "cable", load: "cable" }, basis: "name:cable-crossover→standing fly", confidence: "high" } },
  { name: /wood ?chop|cable lift/, out: { profileId: "crunch", params: { variant: "twist" }, basis: "name:wood-chop→rotational core", confidence: "high" } },
  { name: /rope climb/, out: { profileId: "pull-up", params: { grip: "neutral", assisted: "no" }, basis: "name:rope-climb→vertical pull", confidence: "medium" } },
  { name: /rack pull/, out: { profileId: "hinge", params: { torso: 55, kneeBend: 20, load: "barbell" }, basis: "name:rack-pull→partial deadlift hinge", confidence: "high" } },
  { name: /bear crawl|spider crawl/, out: { profileId: "cardio", params: { variant: "bear-crawl" }, basis: "name:crawl→locomotor", confidence: "high" } },
  { name: /deadlift/, out: { profileId: "hinge", params: { torso: 65, kneeBend: 22, load: "barbell" }, basis: "name:deadlift→hip hinge", confidence: "high" } },
  { name: /elbow to knee/, out: { profileId: "crunch", params: { variant: "bicycle" }, basis: "name:elbow-to-knee→bicycle crunch", confidence: "high" } },
  { name: /leg tuck/, out: { profileId: "crunch", params: { variant: "reverse" }, basis: "name:leg-tuck→knee tuck", confidence: "high" } },
  { name: /hanging pike/, out: { profileId: "leg-raise", params: { position: "hanging" }, basis: "name:hanging-pike→hanging raise", confidence: "high" } },
  { name: /pull.?in/, out: { profileId: "crunch", params: { variant: "reverse" }, basis: "name:pull-in→knee tuck", confidence: "high" } },
  { name: /fallout/, out: { profileId: "rollout", params: { position: "standing" }, basis: "name:fallout→rollout pattern", confidence: "medium" } },
  { name: /pronation|supination/, out: { profileId: "wrist", params: { variant: "rotation" }, basis: "name:forearm rotation", confidence: "high" } },
  { name: /pinch|hand squeeze/, out: { profileId: "wrist", params: { variant: "grip" }, basis: "name:pinch grip→grip hold", confidence: "high" } },
  { name: /bottoms.?up clean/, out: { profileId: "olympic", params: { variant: "clean" }, basis: "name:bottoms-up-clean→olympic clean", confidence: "high" } },
  { name: /hip lift/, out: { profileId: "hip-thrust", params: { elevated: "floor", load: "none", singleLeg: "no" }, basis: "name:hip-lift→glute bridge", confidence: "high" } },
  { name: /toe touch/, out: { profileId: "crunch", params: { variant: "toes-touch" }, basis: "name:toe-touch→crunch", confidence: "high" } },
  { name: /scissor/, out: { profileId: "core-misc", params: { variant: "flutter-kick" }, basis: "name:scissor→leg beat", confidence: "high" } },
  { name: /heavy bag/, out: { profileId: "cardio", params: { variant: "shadow-box" }, basis: "name:heavy-bag→punch display", confidence: "medium" } },
  { name: /around the worlds?/, out: { profileId: "fly", params: { position: "floor", load: "dumbbells" }, basis: "name:around-the-worlds→lying fly circle", confidence: "medium" } },
  { name: /high pulley row|high row|kneeling high pulley/, out: { profileId: "row", params: { position: "seated", load: "cable" }, basis: "name:high-row→seated row", confidence: "high" } },
  { name: /iron cross/, out: { profileId: "fly", params: { position: "cable", load: "cable" }, basis: "name:iron-cross→cable fly", confidence: "medium" } },
  { name: /hip flexion/, out: { profileId: "cardio", params: { variant: "march" }, basis: "name:standing-hip-flexion→march (knee raise)", confidence: "medium" } },
  { name: /rack delivery/, out: { profileId: "strongman", params: { variant: "load-pick" }, basis: "name:rack-delivery→load pick", confidence: "high" } },
  { name: /sled/, out: { profileId: "strongman", params: { variant: "drag" }, basis: "name:sled→drag pattern", confidence: "medium" } },
  { name: /finger curl/, out: { profileId: "wrist", params: { variant: "grip" }, basis: "name: finger curls→grip", confidence: "high" } },
  { name: /monster walk/, out: { profileId: "hip-adduction", params: { motion: "standing" }, basis: "name: monster walk→lateral walk", confidence: "high" } },
  { name: /hamstring slide/, out: { profileId: "leg-curl", params: { position: "lying" }, basis: "name: hamstring slides→leg curl", confidence: "high" } },
  { name: /prone manual hamstring/, out: { profileId: "leg-curl", params: { position: "lying" }, basis: "name: prone manual hamstring→leg curl", confidence: "high" } },
  { name: /sit squat/, out: { profileId: "squat", params: { stance: "standard", depth: 100, load: "none" }, basis: "name: sit squats→squat", confidence: "high" } },
  { name: /pull.?apart/, out: { profileId: "mobility", params: { variant: "band-pull-apart" }, basis: "name: band pull-apart", confidence: "high" } },
  { name: /jammer|car driver/, out: { profileId: "overhead-press", params: { position: "standing", load: "barbell" }, basis: "name: jammer/ car-driver→press", confidence: "medium" } },
  { name: /side laterals?\b|\blaterals\b(?!.*(stretch|pull))/, out: { profileId: "raise", params: { direction: "lateral", load: "dumbbells" }, basis: "name: side laterals→lateral raise", confidence: "high" } },
  { name: /scaption|partials?/, out: { profileId: "raise", params: { direction: "lateral", load: "dumbbells" }, basis: "name: scaption/ partials→raise", confidence: "high" } },
  { name: /halo(?!.*extension)/, out: { profileId: "mobility", params: { variant: "arm-circles" }, basis: "name: halo→shoulder circle", confidence: "medium" } },
  { name: /pirate ship/, out: { profileId: "olympic", params: { variant: "swing" }, basis: "name: pirate-ships→kettlebell swing", confidence: "medium" } },
  { name: /bradford|rocky press|behind.?neck/, out: { profileId: "overhead-press", params: { position: "standing", load: "barbell" }, basis: "name: behind-neck press→overhead", confidence: "high" } },
  { name: /tricep(s)? extension|overhead triceps?/, out: { profileId: "triceps", params: { variant: "overhead", load: "dumbbells" }, basis: "name: triceps extension", confidence: "high" } },
];

/* ------------------------------ قواعد عمومی ------------------------------ */

function eq(ex: ClassifiableExercise, ...tokens: string[]): boolean {
  return tokens.some((t) => ex.equipment.includes(t));
}
function name(ex: ClassifiableExercise): string {
  return ex.enName.toLowerCase();
}
function has(ex: ClassifiableExercise, ...words: string[]): boolean {
  const n = name(ex);
  return words.some((w) => n.includes(w));
}

/** قواعد کشش — اولویت بالا (exerciseType stretching یا pattern stretch) */
const STRETCH_RULES: Rule[] = [
  { name: /smr|foam roll/, out: { profileId: "mobility", params: { variant: "SMR" }, basis: "name:SMR→mobility/SMR", confidence: "high" } },
  { name: /cat( |-)?(stretch|cow)|cat-?cow/, out: { profileId: "static-stretch", params: { variant: "cat-cow" }, basis: "name:cat-cow", confidence: "high" } },
  { name: /child/, out: { profileId: "static-stretch", params: { variant: "childs-pose" }, basis: "name:child's-pose", confidence: "high" } },
  { name: /cobra/, out: { profileId: "static-stretch", params: { variant: "cobra" }, basis: "name:cobra", confidence: "high" } },
  { name: /pigeon/, out: { profileId: "static-stretch", params: { variant: "pigeon" }, basis: "name:pigeon", confidence: "high" } },
  { name: /90\/90|hamstring.*(stretch|stretching)|stretch.*hamstring/, out: { profileId: "static-stretch", params: { variant: "seated-hamstring" }, basis: "name:hamstring-stretch→seated", confidence: "high" } },
  { name: /calf.*(stretch)|stretch.*calf/, out: { profileId: "static-stretch", params: { variant: "calf-wall" }, basis: "name:calf-stretch→wall", confidence: "high" } },
  { name: /groin|adductor.*(stretch)|butterfly|inner thigh/, out: { profileId: "static-stretch", params: { variant: "groin" }, basis: "name:groin-stretch", confidence: "high" } },
  { name: /it band|glute.*stretch|piriformis/, out: { profileId: "static-stretch", params: { variant: "figure-four" }, basis: "name:glute/it-band-stretch→figure-four", confidence: "high" } },
  { name: /hip flexor.*(stretch)|stretch.*hip flexor|lunge.*stretch|kneeling hip/, out: { profileId: "static-stretch", params: { variant: "lunge-stretch" }, basis: "name:hip-flexor-stretch→lunge", confidence: "high" } },
  { name: /quad.*(stretch)|stretch.*quad|all fours quad/, out: { profileId: "static-stretch", params: { variant: "standing-quad" }, basis: "name:quad-stretch→standing", confidence: "high" } },
  { name: /chest.*(stretch)|stretch.*chest|pec.*stretch/, out: { profileId: "static-stretch", params: { variant: "chest-door" }, basis: "name:chest-stretch→frame", confidence: "high" } },
  { name: /(front of )?shoulder.*stretch|shoulder.*stretch|rotator.*stretch/, out: { profileId: "static-stretch", params: { variant: "shoulder-cross" }, basis: "name:shoulder-stretch→cross-body", confidence: "high" } },
  { name: /neck/, out: { profileId: "static-stretch", params: { variant: "neck" }, basis: "name:neck-stretch", confidence: "high" } },
  { name: /wrist.*stretch|forearm.*stretch|stretch.*forearm/, out: { profileId: "static-stretch", params: { variant: "wrist" }, basis: "name:wrist-stretch", confidence: "high" } },
  { name: /lat.*stretch|side.*stretch|oblique.*stretch|lateral.*stretch/, out: { profileId: "static-stretch", params: { variant: "standing-side" }, basis: "name:side/lat-stretch", confidence: "high" } },
  { name: /lower back.*stretch|back.*stretch/, out: { profileId: "static-stretch", params: { variant: "childs-pose" }, basis: "name:back-stretch→childs-pose", confidence: "medium" } },
  { name: /ankle.*(stretch|circles)/, out: { profileId: "mobility", params: { variant: "ankle-circles" }, basis: "name:ankle-mobility", confidence: "high" } },
  { name: /hip.*(circles)/, out: { profileId: "mobility", params: { variant: "hip-circles" }, basis: "name:hip-circles", confidence: "high" } },
  { name: /arm.*circles/, out: { profileId: "mobility", params: { variant: "arm-circles" }, basis: "name:arm-circles", confidence: "high" } },
  { name: /elbow.*circles|circle.*elbow/, out: { profileId: "mobility", params: { variant: "elbow-circles" }, basis: "name:elbow-circles", confidence: "high" } },
  { name: /dynamic.*(back|chest|stretch)|inchworm|walkout|world's greatest/, out: { profileId: "mobility", params: { variant: "inchworm" }, basis: "name:dynamic-mobility", confidence: "high" } },
  { name: /leg (raises?|swings?)$|front leg raise/, out: { profileId: "mobility", params: { variant: "leg-swing" }, basis: "name:leg-swing-mobility", confidence: "high" } },
  { name: /elbows back|elbow back/, out: { profileId: "mobility", params: { variant: "elbow-circles" }, basis: "name:elbows-back→mobility", confidence: "medium" } },
  { name: /band pull( |-)?apart/, out: { profileId: "mobility", params: { variant: "band-pull-apart" }, basis: "name:band-pull-apart", confidence: "high" } },
  { name: /dislocate|around the world/, out: { profileId: "mobility", params: { variant: "dislocate" }, basis: "name:shoulder-mobility→dislocate", confidence: "high" } },
  { name: /up( per)? body stretch|chair.*stretch|seated.*stretch/, out: { profileId: "static-stretch", params: { variant: "shoulder-cross" }, basis: "name:upper-body-stretch→cross-body", confidence: "medium" } },
  { name: /lunge.*open|groiners|frog hops?$/, out: { profileId: "mobility", params: { variant: "leg-swing" }, basis: "name:dynamic-groin-mobility", confidence: "medium" } },
  { name: /hug|knees to chest|knee across/, out: { profileId: "static-stretch", params: { variant: "knee-chest" }, basis: "name:knee-to-chest-family", confidence: "high" } },
  { name: /ankle on the knee|lying (glute|crossover)/, out: { profileId: "static-stretch", params: { variant: "figure-four" }, basis: "name:glute-figure-four", confidence: "high" } },
  { name: /knee circles/, out: { profileId: "mobility", params: { variant: "hip-circles" }, basis: "name:knee-circles→mobility", confidence: "high" } },
  { name: /wrist circles/, out: { profileId: "wrist", params: { variant: "rotation" }, basis: "name:wrist-circles→rotation", confidence: "high" } },
  { name: /hang(ing)?$/, out: { profileId: "plank", params: { variant: "dead-hang" }, basis: "name:hang→dead-hang hold", confidence: "medium" } },
  { name: /pyramid/, out: { profileId: "static-stretch", params: { variant: "calf-wall" }, basis: "name:pyramid-stretch→calf wall", confidence: "medium" } },
  { name: /overhead (lat|stretch)/, out: { profileId: "static-stretch", params: { variant: "standing-side" }, basis: "name:overhead-lat-stretch", confidence: "medium" } },
  { name: /against wall/, out: { profileId: "static-stretch", params: { variant: "chest-door" }, basis: "name:against-wall→chest stretch", confidence: "medium" } },
  { name: /spinal/, out: { profileId: "static-stretch", params: { variant: "standing-side" }, basis: "name:spinal-stretch→twist", confidence: "medium" } },
  { name: /superman/, out: { profileId: "plank", params: { variant: "superman" }, basis: "name:superman→prone hold", confidence: "high" } },
  { name: /dancer/, out: { profileId: "static-stretch", params: { variant: "standing-quad" }, basis: "name:dancer-stretch→standing quad", confidence: "medium" } },
  { name: /peroneal|tibialis|soleus|achilles/, out: { profileId: "static-stretch", params: { variant: "calf-wall" }, basis: "name:lower-leg-stretch→calf wall", confidence: "medium" } },
  { name: /biceps stretch|seated biceps$/, out: { profileId: "static-stretch", params: { variant: "shoulder-cross" }, basis: "name:biceps-stretch→arm stretch", confidence: "medium" } },
  { name: /adductor/, out: { profileId: "static-stretch", params: { variant: "groin" }, basis: "name:adductor-stretch→groin", confidence: "medium" } },
  { name: /knee to chest/, out: { profileId: "static-stretch", params: { variant: "knee-chest" }, basis: "name:knee-to-chest", confidence: "high" } },
  { name: /seated glute|figure/, out: { profileId: "static-stretch", params: { variant: "figure-four" }, basis: "name:seated-glute→figure-four", confidence: "high" } },
  { name: /windmill/, out: { profileId: "static-stretch", params: { variant: "standing-side" }, basis: "name:windmill-stretch→side", confidence: "medium" } },
  { name: /lying hamstring/, out: { profileId: "static-stretch", params: { variant: "supine-hamstring" }, basis: "name:lying-hamstring", confidence: "high" } },
  { name: /seated hamstring/, out: { profileId: "static-stretch", params: { variant: "seated-hamstring" }, basis: "name:seated-hamstring", confidence: "high" } },
  { name: /runner/, out: { profileId: "static-stretch", params: { variant: "lunge-stretch" }, basis: "name:runner-stretch→lunge", confidence: "high" } },
  { name: /split squat/, out: { profileId: "static-stretch", params: { variant: "lunge-stretch" }, basis: "name:split-stance-stretch→lunge", confidence: "medium" } },
  { name: /straddle/, out: { profileId: "static-stretch", params: { variant: "groin" }, basis: "name:straddle→groin", confidence: "high" } },
  { name: /upper back.?leg/, out: { profileId: "static-stretch", params: { variant: "seated-hamstring" }, basis: "name:upper-back-leg-grab→seated hamstring", confidence: "medium" } },
  { name: /iron cross/, out: { profileId: "static-stretch", params: { variant: "groin" }, basis: "name:iron-crosses→groin", confidence: "medium" } },
  { name: /looking at ceiling/, out: { profileId: "static-stretch", params: { variant: "neck" }, basis: "name:looking-at-ceiling→neck", confidence: "high" } },
  { name: /prone quadriceps/, out: { profileId: "static-stretch", params: { variant: "standing-quad" }, basis: "name:prone-quad-stretch", confidence: "medium" } },
  { name: /locust/, out: { profileId: "static-stretch", params: { variant: "cobra" }, basis: "name:locust→cobra", confidence: "medium" } },
  { name: /hip flexor/, out: { profileId: "static-stretch", params: { variant: "lunge-stretch" }, basis: "name:hip-flexor-stretch→lunge", confidence: "high" } },
  { name: /front deltoid|deltoid stretch/, out: { profileId: "static-stretch", params: { variant: "shoulder-cross" }, basis: "name:deltoid-stretch→cross-body", confidence: "medium" } },
  { name: /shoulder circles/, out: { profileId: "mobility", params: { variant: "arm-circles" }, basis: "name:shoulder-circles", confidence: "high" } },
  { name: /shoulder raise|triceps stretch|overhead triceps/, out: { profileId: "static-stretch", params: { variant: "shoulder-cross" }, basis: "name:arm-stretch→cross-body", confidence: "medium" } },
  { name: /wrist pull/, out: { profileId: "static-stretch", params: { variant: "wrist" }, basis: "name:side-wrist-pull→wrist", confidence: "high" } },
  { name: /upward stretch/, out: { profileId: "static-stretch", params: { variant: "standing-side" }, basis: "name:upward-stretch→overhead side", confidence: "medium" } },
];

/** قواعد هوازی */
const CARDIO_RULES: Rule[] = [
  { name: /bicycl|air bike|stationary bike/, out: { profileId: "cardio", params: { variant: "pedal" }, basis: "name: cycling→seated pedal", confidence: "high" } },
  { name: /elliptical|treadmill|jog|run(ning)?|stair( |)climb|stepper|walk(ing)?/, out: { profileId: "cardio", params: { variant: "march" }, basis: "name: locomotor→march in place", confidence: "high" } },
  { name: /jump(ing)? rope|skipping/, out: { profileId: "cardio", params: { variant: "rope" }, basis: "name: jump rope", confidence: "high" } },
  { name: /shadow|bag|boxing|punch/, out: { profileId: "cardio", params: { variant: "shadow-box" }, basis: "name: boxing", confidence: "high" } },
  { name: /jumping jack|star jump|seal jack/, out: { profileId: "cardio", params: { variant: "jumping-jacks" }, basis: "name: jacks", confidence: "high" } },
  { name: /burpee/, out: { profileId: "cardio", params: { variant: "burpee" }, basis: "name: burpee", confidence: "high" } },
  { name: /mountain climber/, out: { profileId: "core-misc", params: { variant: "mountain-climber" }, basis: "name: mountain climbers", confidence: "high" } },
  { name: /bear crawl|crawl/, out: { profileId: "cardio", params: { variant: "bear-crawl" }, basis: "name: crawl", confidence: "high" } },
  { name: /row(ing)? machine|rower|air rower/, out: { profileId: "row", params: { position: "seated", load: "cable" }, basis: "name: rowing machine→seated row", confidence: "high" } },
  { name: /step( |-)?touch|grapevine|carioca|quick step|skip/, out: { profileId: "cardio", params: { variant: "step-touch" }, basis: "name: side-step cardio", confidence: "medium" } },
  { name: /bike/, out: { profileId: "cardio", params: { variant: "pedal" }, basis: "name: bike→pedal", confidence: "high" } },
  { name: /rope( |-)?jump|jump(ing)? rope/, out: { profileId: "cardio", params: { variant: "rope" }, basis: "name: rope jumping", confidence: "high" } },
  { name: /row(ing)?|erg/, out: { profileId: "row", params: { position: "seated", load: "cable" }, basis: "name: rowing machine→seated row", confidence: "high" } },
  { name: /skating|skate/, out: { profileId: "cardio", params: { variant: "step-touch" }, basis: "name: skating→side-step", confidence: "medium" } },
  { name: /stair|step mill|stepper/, out: { profileId: "cardio", params: { variant: "march" }, basis: "name: stair climbing→march", confidence: "high" } },
];

/** قواعد پلایومتریک */
const PLYO_RULES: Rule[] = [
  { name: /box jump|jump.*box|depth jump/, out: { profileId: "plyo", params: { variant: "box-jump" }, basis: "name: box/depth jump", confidence: "high" } },
  { name: /tuck jump|knee tuck/, out: { profileId: "plyo", params: { variant: "tuck-jump" }, basis: "name: tuck jump", confidence: "high" } },
  { name: /lunge jump|jump lunge|split jump|jumping lunge/, out: { profileId: "plyo", params: { variant: "lunge-jump" }, basis: "name: jumping lunge", confidence: "high" } },
  { name: /hurdle hops?|cone hops?|lateral hops?|single.leg hop/, out: { profileId: "plyo", params: { variant: "hop" }, basis: "name: hops", confidence: "high" } },
  { name: /bound|leap|diagonal/, out: { profileId: "plyo", params: { variant: "bound" }, basis: "name: bound/leap", confidence: "high" } },
  { name: /slam/, out: { profileId: "plyo", params: { variant: "slam" }, basis: "name: slam throw", confidence: "high" } },
  { name: /scoop throw|overhead throw|backward.*throw|catch and/, out: { profileId: "plyo", params: { variant: "throw-overhead" }, basis: "name: overhead/ scoop throw", confidence: "high" } },
  { name: /chest pass|chest push|throw|toss/, out: { profileId: "plyo", params: { variant: "throw-chest" }, basis: "name: chest throw", confidence: "high" } },
  { name: /sprint|acceleration|start technique|speed drill|kneeling arm drill/, out: { profileId: "plyo", params: { variant: "sprint" }, basis: "name: sprint drill", confidence: "high" } },
  { name: /jump squat|squat jump/, out: { profileId: "plyo", params: { variant: "tuck-jump" }, basis: "name: squat jump→tuck-jump", confidence: "high" } },
  { name: /drop push|jump.*push|push.*jump|clap push/, out: { profileId: "push-up", params: { angle: "floor", width: "standard" }, basis: "name: explosive push-up→push-up pattern", confidence: "medium" } },
  { name: /plyo.*push|push.*plyo|clap push/, out: { profileId: "push-up", params: { angle: "floor", width: "standard" }, basis: "name: explosive push-up→push-up pattern", confidence: "high" } },
  { name: /twist/, out: { profileId: "crunch", params: { variant: "twist" }, basis: "name: twist→rotational core", confidence: "high" } },
  { name: /carioca|grapevine|quick step/, out: { profileId: "cardio", params: { variant: "step-touch" }, basis: "name: carioca→side-step", confidence: "high" } },
  { name: /mountain climber/, out: { profileId: "core-misc", params: { variant: "mountain-climber" }, basis: "name: mountain climbers", confidence: "high" } },
  { name: /skip/, out: { profileId: "cardio", params: { variant: "step-touch" }, basis: "name: skipping→in-place step", confidence: "medium" } },
  { name: /butt kick/, out: { profileId: "cardio", params: { variant: "march" }, basis: "name: butt kick→running drill", confidence: "medium" } },
  { name: /claw|push.?off/, out: { profileId: "plyo", params: { variant: "bound" }, basis: "name: push-off drill→bound", confidence: "medium" } },
  { name: /shuffle/, out: { profileId: "cardio", params: { variant: "step-touch" }, basis: "name: shuffle→side-step", confidence: "medium" } },
  { name: /stance/, out: { profileId: "plyo", params: { variant: "sprint" }, basis: "name: stance drill→sprint", confidence: "medium" } },
  { name: /flying|frog hops?|jump/, out: { profileId: "plyo", params: { variant: "vertical-jump" }, basis: "name: jump→vertical", confidence: "medium" } },
];

/** قواعد المپیک */
const OLYMPIC_RULES: Rule[] = [
  { name: /deadlift|stiff legs?/, out: { profileId: "hinge", params: { torso: 65, kneeBend: 22, load: "barbell" }, basis: "name: olympic deadlift→hinge", confidence: "high" } },
  { name: /shrug/, out: { profileId: "shrug", params: { load: "barbell" }, basis: "name: olympic shrug→shrug", confidence: "high" } },
  { name: /jump|squat/, out: { profileId: "plyo", params: { variant: "tuck-jump" }, basis: "name: olympic jump drill→plyo", confidence: "medium" } },
  { name: /snatch|muscle snatch/, out: { profileId: "olympic", params: { variant: "snatch" }, basis: "name: snatch", confidence: "high" } },
  { name: /clean(?! and jerk).*(jerk)|jerk/, out: { profileId: "olympic", params: { variant: "jerk" }, basis: "name: jerk", confidence: "high" } },
  { name: /push press/, out: { profileId: "olympic", params: { variant: "jerk" }, basis: "name: push press→jerk drive", confidence: "high" } },
  { name: /clean/, out: { profileId: "olympic", params: { variant: "clean" }, basis: "name: clean", confidence: "high" } },
  { name: /high pull\b|upright row/, out: { profileId: "olympic", params: { variant: "high-pull" }, basis: "name: high pull/ upright row", confidence: "high" } },
  { name: /swing/, out: { profileId: "olympic", params: { variant: "swing" }, basis: "name: swing", confidence: "high" } },
];

/** قواعد استرونگمن */
const STRONGMAN_RULES: Rule[] = [
  { name: /carry|suitcase|yoke|farm|walk/, out: { profileId: "strongman", params: { variant: "carry" }, basis: "name: loaded carry", confidence: "high" } },
  { name: /stone|keg|atlas|load|anvil|sandbag/, out: { profileId: "strongman", params: { variant: "load-pick" }, basis: "name: object load", confidence: "high" } },
  { name: /drag|sled|prowler|tire flip|flip/, out: { profileId: "strongman", params: { variant: "drag" }, basis: "name: sled/ drag", confidence: "high" } },
  { name: /log lift|axle press|circus/, out: { profileId: "strongman", params: { variant: "press-log" }, basis: "name: log/ axle press", confidence: "high" } },
  { name: /conan|fingal|heaving/, out: { profileId: "strongman", params: { variant: "carry" }, basis: "name: strongman event→carry", confidence: "medium" } },
  { name: /rack delivery/, out: { profileId: "strongman", params: { variant: "load-pick" }, basis: "name: rack delivery→load", confidence: "high" } },
  { name: /sled.*walk|backward walk|stairs/, out: { profileId: "strongman", params: { variant: "drag" }, basis: "name: sled walk→drag pattern", confidence: "medium" } },
];

/** قواعد مرکزی بدن */
const CORE_RULES: Rule[] = [
  { name: /reverse crunch/, out: { profileId: "crunch", params: { variant: "reverse" }, basis: "name: reverse crunch", confidence: "high" } },
  { name: /bicycle/, out: { profileId: "crunch", params: { variant: "bicycle" }, basis: "name: bicycle crunch", confidence: "high" } },
  { name: /russian twist|twist(?!.*wrist)|judo flip| rotational/, out: { profileId: "crunch", params: { variant: "twist" }, basis: "name: rotational core", confidence: "high" } },
  { name: /toe(s)? (touch|to bar)|toes to/, out: { profileId: "crunch", params: { variant: "toes-touch" }, basis: "name: toes-touch", confidence: "high" } },
  { name: /heel touch|heel tap/, out: { profileId: "crunch", params: { variant: "heel-touch" }, basis: "name: heel touchers", confidence: "high" } },
  { name: /frog( sit| style)?/, out: { profileId: "crunch", params: { variant: "frog" }, basis: "name: frog crunch", confidence: "medium" } },
  { name: /sit( |-)?up|situps?/, out: { profileId: "crunch", params: { variant: "situp" }, basis: "name: sit-up", confidence: "high" } },
  { name: /crunch|abdominal|abs? (exercise|squeeze)/, out: { profileId: "crunch", params: { variant: "crunch" }, basis: "name: crunch family", confidence: "high" } },
  { name: /ab (roller|wheel)|rollout|roll out|ab wheel/, out: { profileId: "rollout", params: { position: "knees" }, basis: "name: ab rollout", confidence: "high" } },
  { name: /hanging (leg|knee|hip)|knee raise|leg raise|leg lift|hip raise|leg pull.?in|butt.?ups?|cocoon/, out: { profileId: "leg-raise", params: { position: "hanging" }, basis: "name: hanging raise", confidence: "high" }, where: (ex) => has(ex, "hanging") || ex.pattern === "core-stability" || true },
  { name: /captain|chair.*(leg|knee)|parallel bars.*(raise|leg)/, out: { profileId: "leg-raise", params: { position: "captains" }, basis: "name: captain's chair", confidence: "high" } },
  { name: /(lying|flat bench|incline).*(leg|hip|knee) (raise|lift)|decline.*(leg|hip) raise/, out: { profileId: "leg-raise", params: { position: "lying" }, basis: "name: lying leg raise", confidence: "high" } },
  { name: /side (leg|lying leg) (raise|lift)|lying (hip )?abduction|side lying/, out: { profileId: "leg-raise", params: { position: "lying-side" }, basis: "name: side-lying leg raise", confidence: "high" } },
  { name: /flutter|scissor|windshield/, out: { profileId: "core-misc", params: { variant: "flutter-kick" }, basis: "name: flutter/ scissor", confidence: "high" } },
  { name: /v.?up|jackknife/, out: { profileId: "core-misc", params: { variant: "v-up" }, basis: "name: v-up", confidence: "high" } },
  { name: /dead ?bug/, out: { profileId: "dead-bug", params: { variant: "dead-bug" }, basis: "name: dead bug", confidence: "high" } },
  { name: /bird ?dog|quadruped (limb|alternate)/, out: { profileId: "dead-bug", params: { variant: "bird-dog" }, basis: "name: bird dog", confidence: "high" } },
  { name: /side plank|lateral plank/, out: { profileId: "plank", params: { variant: "side" }, basis: "name: side plank (isometric hold)", confidence: "high" } },
  { name: /plank/, out: { profileId: "plank", params: { variant: "straight" }, basis: "name: plank (isometric hold)", confidence: "high" } },
  { name: /hollow (body|hold|rock)/, out: { profileId: "plank", params: { variant: "hollow" }, basis: "name: hollow hold", confidence: "high" } },
  { name: /superman|swimmer/, out: { profileId: "plank", params: { variant: "superman" }, basis: "name: superman hold", confidence: "high" } },
  { name: /wall sit/, out: { profileId: "plank", params: { variant: "wall-sit" }, basis: "name: wall sit", confidence: "high" } },
  { name: /dead hang|active hang/, out: { profileId: "plank", params: { variant: "dead-hang" }, basis: "name: dead hang", confidence: "high" } },
  { name: /v.?sit|l.?sit/, out: { profileId: "plank", params: { variant: "v-sit" }, basis: "name: v-sit hold", confidence: "high" } },
  { name: /side bend/, out: { profileId: "side-bend", params: { load: "dumbbell" }, basis: "name: side bend", confidence: "high" } },
  { name: /pallof|anti.?rotation/, out: { profileId: "core-misc", params: { variant: "press-out" }, basis: "name: anti-rotation press-out", confidence: "medium" } },
  { name: /isometric/, out: { profileId: "plank", params: { variant: "straight" }, basis: "name: isometric→hold", confidence: "medium" } },
  { name: /mountain climber/, out: { profileId: "core-misc", params: { variant: "mountain-climber" }, basis: "name: mountain climbers", confidence: "high" } },
  { name: /\b(core|abs?|abdominals?)\b/, out: { profileId: "crunch", params: { variant: "crunch" }, basis: "fallback: core category→crunch", confidence: "medium" } },
  ];

/** قواعد پرس و سینه */
const PUSH_RULES: Rule[] = [
  { name: /bench press|bench(?!.*(row|dip|step|jump|sprint|leg|curl|crunch|pull|fly)),?( |-)?(press)?/, where: (ex) => has(ex, "bench") && !has(ex, "row", "dip", "step", "jump", "sprint", "leg", "curl", "crunch", "pull", "fly"), not: (ex) => has(ex, "incline row", "bench pull"), out: { profileId: "bench-press", params: { angle: "flat", load: "barbell" }, basis: "name: bench press+equipment", confidence: "high" } },
  { name: /bench pull|incline bench pull/, out: { profileId: "row", params: { position: "supported", load: "dumbbells" }, basis: "name: bench pull→supported row", confidence: "high" } },
  { name: /incline.*(press|bench press)|incline bench/, out: { profileId: "bench-press", params: { angle: "incline", load: "barbell" }, basis: "name: incline press", confidence: "high" } },
  { name: /decline.*(press|bench)/, out: { profileId: "bench-press", params: { angle: "decline", load: "barbell" }, basis: "name: decline press", confidence: "high" } },
  { name: /chest press|press( |-)?behind|machine press/, where: (ex) => eq(ex, "machine", "cable"), out: { profileId: "bench-press", params: { angle: "flat", load: "machine" }, basis: "name: chest press machine", confidence: "high" } },
  { name: /floor press/, out: { profileId: "floor-press", params: { load: "dumbbells" }, basis: "name: floor press", confidence: "high" } },
  { name: /push( |-)?up|pushup/, out: { profileId: "push-up", params: { angle: "floor", width: "standard" }, basis: "name: push-up family", confidence: "high" } },
  { name: /dip(?!s.*stretch)/, not: (ex) => has(ex, "stretch", "leg"), out: { profileId: "dip", params: { lean: "upright" }, basis: "name: dips", confidence: "high" } },
  { name: /\bflye?s?\b|chest fly|deck fly/, out: { profileId: "fly", params: { position: "floor", load: "dumbbells" }, basis: "name: fly", confidence: "high" } },
  { name: /pec deck|butterfly machine/, out: { profileId: "fly", params: { position: "standing", load: "machine" }, basis: "name: pec deck machine", confidence: "high" } },
  { name: /serratus|scap(ular)? (pull|push)|scapulation/, out: { profileId: "push-up", params: { angle: "floor", width: "standard" }, basis: "name: scapular movement→push-up pattern", confidence: "medium" } },
  { name: /press/, where: (ex) => eq(ex, "dumbbell") && has(ex, "alternating", "alternate"), out: { profileId: "overhead-press", params: { position: "standing", load: "dumbbells", alternating: "yes" }, basis: "name: alternating press", confidence: "high" } },
  { name: /(alternat|seesaw).*(press)/, out: { profileId: "overhead-press", params: { position: "standing", load: "dumbbells", alternating: "yes" }, basis: "name: alternating press", confidence: "high" } },
  { name: /(shoulder|overhead|military|arnold|behind neck|vertical|seated).*(press)|press(ing)?( overhead)?$/, out: { profileId: "overhead-press", params: { position: "standing", load: "dumbbells" }, basis: "name: overhead press family", confidence: "high" } },
  { name: /landmine|t.?bar(?!.*(row|pull))/, out: { profileId: "overhead-press", params: { position: "standing", load: "barbell" }, basis: "name: landmine/ t-bar press→overhead press (simplified)", confidence: "medium" } },
  { name: /press/, out: { profileId: "bench-press", params: { angle: "flat", load: "barbell" }, basis: "fallback: press→bench press", confidence: "medium" } },
];

/** قواعد سرشانه و نشر */
const SHOULDER_RULES: Rule[] = [
  { name: /face pull/, out: { profileId: "shoulder-rotation", params: { variant: "face-pull", load: "cable" }, basis: "name: face pull", confidence: "high" } },
  { name: /(external|internal) rotation|rotator cuff/, out: { profileId: "shoulder-rotation", params: { variant: "external", load: "cable" }, basis: "name: rotator cuff", confidence: "high" } },
  { name: /rear (delt|lateral|deltoid)|reverse fly|back fly|bent.*(fly|lateral)|rear delt|lying.*rear/, out: { profileId: "fly", params: { position: "reverse", load: "dumbbells" }, basis: "name: rear delt fly", confidence: "high" } },
  { name: /front (delt)? ?(raise|lift)|plate raise|thompson|front.*raise|raise.*front/, out: { profileId: "raise", params: { direction: "front", load: "plate" }, basis: "name: front raise", confidence: "high" } },
  { name: /(lateral|side|front|deltoid|scaption).*(raise)|raise.*(lateral|side|front|deltoid)| delt raise/, out: { profileId: "raise", params: { direction: "lateral", load: "dumbbells" }, basis: "name: deltoid raise", confidence: "high" } },
  { name: /shrug/, out: { profileId: "shrug", params: { load: "dumbbells" }, basis: "name: shrug", confidence: "high" } },
  { name: /lean.*(raise)|raise.*lean|leaning/, out: { profileId: "raise", params: { direction: "lean-lateral", load: "dumbbells" }, basis: "name: leaning raise", confidence: "high" } },
  { name: /(shoulder|delt).*(raise)|raise/, out: { profileId: "raise", params: { direction: "lateral", load: "dumbbells" }, basis: "name: raise→lateral", confidence: "medium" } },
  { name: /(shoulder|delt).*(press)/, out: { profileId: "overhead-press", params: { position: "standing", load: "dumbbells" }, basis: "name: shoulder press→overhead", confidence: "medium" } },
];

/** قواعد کشش پشت (پول) */
const PULL_RULES: Rule[] = [
  { name: /pull( |-)?up|pullup|chin( |-)?up|chinup|chins?\b|muscle( |-)?up|kipping/, out: { profileId: "pull-up", params: { grip: "pronated", assisted: "no" }, basis: "name: pull-up family", confidence: "high" } },
  { name: /(lat|front) pull( |-)?down|pull( |-)?down|lat machine|straight.?arm (pull|push|bar)/, out: { profileId: "pulldown", params: { grip: "standard", variant: "pulldown" }, basis: "name: pulldown family", confidence: "high" } },
  { name: /inverted (row|pull)|body(weight)? row|australian/, out: { profileId: "row", params: { position: "inverted", load: "none" }, basis: "name: inverted row", confidence: "high" } },
  { name: /chest supported|incline row|supported row|prone row/, out: { profileId: "row", params: { position: "supported", load: "dumbbells" }, basis: "name: chest-supported row", confidence: "high" } },
  { name: /(one|single).?(arm|hand).*(row)|kroc|renegade/, out: { profileId: "row", params: { position: "one-arm", load: "dumbbells" }, basis: "name: one-arm row", confidence: "high" } },
  { name: /seated (cable |machine )?row|seated row/, out: { profileId: "row", params: { position: "seated", load: "cable" }, basis: "name: seated row", confidence: "high" } },
  { name: /row/, out: { profileId: "row", params: { position: "bent-over", load: "barbell" }, basis: "name: row→bent-over", confidence: "high" } },
  { name: /pull through|pull.?through/, out: { profileId: "hinge", params: { torso: 55, kneeBend: 20, load: "band" }, basis: "name: cable pull-through→hip hinge", confidence: "high" } },
  { name: /pullover|pull over/, out: { profileId: "pullover", params: { position: "lying", load: "dumbbells" }, basis: "name: pullover", confidence: "high" } },
  { name: /hyper( ?extension)?|back extension|reverse hyper/, out: { profileId: "hinge", params: { torso: 45, kneeBend: 6, load: "none" }, basis: "name: back extension→hip hinge", confidence: "high" } },
  { name: /good morning/, out: { profileId: "hinge", params: { torso: 65, kneeBend: 14, load: "barbell" }, basis: "name: good morning→hinge", confidence: "high" } },
  { name: /shrug/, out: { profileId: "shrug", params: { load: "barbell" }, basis: "name: shrug (pull context)", confidence: "high" } },
  { name: /curl(?!.*(leg|hamstring|wrist))/, out: { profileId: "curl", params: { variant: "standing", load: "dumbbells" }, basis: "name: curl family (pull context)", confidence: "high" } },
];

/** قواعد بازو */
const ARM_RULES: Rule[] = [
  { name: /wrist (curl|flex)|wrist roller|reverse wrist|wrist rotation|forearm (curl|flex)/, out: { profileId: "wrist", params: { variant: "curl" }, basis: "name: wrist flexion", confidence: "high" } },
  { name: /wrist|forearm|gripper/, out: { profileId: "wrist", params: { variant: "grip" }, basis: "name: grip/ forearm", confidence: "medium" } },
  { name: /hammer curl|cross body hammer|pinwheel/, out: { profileId: "curl", params: { variant: "hammer", load: "dumbbells" }, basis: "name: hammer curl", confidence: "high" } },
  { name: /incline curl/, out: { profileId: "curl", params: { variant: "incline", load: "dumbbells" }, basis: "name: incline curl", confidence: "high" } },
  { name: /preacher curl|spider curl/, out: { profileId: "curl", params: { variant: "preacher", load: "dumbbells" }, basis: "name: preacher curl", confidence: "high" } },
  { name: /concentration curl/, out: { profileId: "curl", params: { variant: "concentration", load: "dumbbells" }, basis: "name: concentration curl", confidence: "high" } },
  { name: /alternate(ing)? (dumbbell )?curl|zottman/, out: { profileId: "curl", params: { variant: "alternate", load: "dumbbells" }, basis: "name: alternating curl", confidence: "high" } },
  { name: /barbell curl|ez.?bar curl|curl( with)? bar/, out: { profileId: "curl", params: { variant: "barbell", load: "barbell" }, basis: "name: barbell curl", confidence: "high" } },
  { name: /cable curl|band curl/, out: { profileId: "curl", params: { variant: "cable", load: "cable" }, basis: "name: cable curl", confidence: "high" } },
  { name: /biceps?|bicep.*/, out: { profileId: "curl", params: { variant: "standing", load: "dumbbells" }, basis: "name: curl family", confidence: "high" } },
  { name: /skull( ?crusher)?|lying triceps|nose( ?breaker)?|french press/, out: { profileId: "triceps", params: { variant: "skullcrusher", load: "ez" }, basis: "name: skullcrusher family", confidence: "high" } },
  { name: /(push|press) ?down|pushdown|pressdown|triceps( machine)? (push|press)/, out: { profileId: "triceps", params: { variant: "pushdown", load: "cable" }, basis: "name: pushdown", confidence: "high" } },
  { name: /kickback(?!.*glute)|triceps kick/, out: { profileId: "triceps", params: { variant: "kickback", load: "dumbbells" }, basis: "name: triceps kickback", confidence: "high" } },
  { name: /overhead triceps|triceps extension|overhead extension|behind head extension/, out: { profileId: "triceps", params: { variant: "overhead", load: "dumbbells" }, basis: "name: overhead triceps", confidence: "high" } },
  { name: /bench dip|chair dip/, out: { profileId: "triceps", params: { variant: "bench-dip", load: "none" }, basis: "name: bench dip", confidence: "high" } },
  { name: /wrist (curl|flex)|wrist roller|reverse wrist|wrist rotation|forearm (curl|flex)/, out: { profileId: "wrist", params: { variant: "curl" }, basis: "name: wrist flexion", confidence: "high" } },
  { name: /wrist|forearm|gripper/, out: { profileId: "wrist", params: { variant: "grip" }, basis: "name: grip/ forearm", confidence: "medium" } },
  { name: /chain( handle)? extension|chain press/, out: { profileId: "triceps", params: { variant: "pushdown", load: "cable" }, basis: "name: chain extension→pushdown", confidence: "medium" } },
];

/** قواعد پا */
const LEG_RULES: Rule[] = [
  { name: /(romanian|rdl|stiff( |-)?leg|straight.?leg).*(deadlift|dead lift)|russian (deadlift|lean)/, out: { profileId: "hinge", params: { torso: 70, kneeBend: 12, load: "barbell" }, basis: "name: romanian/ stiff-leg deadlift", confidence: "high" } },
  { name: /single.?leg deadlift|one.?leg deadlift/, out: { profileId: "hinge", params: { torso: 65, kneeBend: 14, load: "dumbbells" }, basis: "name: single-leg deadlift→hinge (simplified)", confidence: "medium" } },
  { name: /dead( |-)?lift/, out: { profileId: "hinge", params: { torso: 65, kneeBend: 22, load: "barbell" }, basis: "name: deadlift→hinge", confidence: "high" } },
  { name: /bulgarian|split squat|pistol|single.leg squat|cossack/, out: { profileId: "split-squat", params: { side: "alternate", load: "none" }, basis: "name: split/ single-leg squat", confidence: "high" } },
  { name: /step( |-)?up|step.?ups?/, out: { profileId: "step-up", params: { load: "none" }, basis: "name: step-up", confidence: "high" } },
  { name: /lunge|crossover/, out: { profileId: "lunge", params: { direction: "forward", load: "none" }, basis: "name: lunge family", confidence: "high" } },
  { name: /front squat|goblet|thruster/, out: { profileId: "squat", params: { stance: "standard", depth: 100, load: "front" }, basis: "name: front/ goblet squat", confidence: "high" } },
  { name: /overhead squat|sots press/, out: { profileId: "squat", params: { stance: "standard", depth: 100, load: "overhead" }, basis: "name: overhead squat", confidence: "high" } },
  { name: /sumo|wide( |-)?stance|plie/, out: { profileId: "squat", params: { stance: "wide", depth: 100, load: "none" }, basis: "name: wide-stance squat", confidence: "high" } },
  { name: /hack squat/, out: { profileId: "leg-press", params: { variant: "hack-squat" }, basis: "name: hack squat machine", confidence: "high" } },
  { name: /leg press|vertical press|sissy|squat machine|machine squat/, out: { profileId: "leg-press", params: { variant: "leg-press" }, basis: "name: leg press machine", confidence: "high" } },
  { name: /squat/, out: { profileId: "squat", params: { stance: "standard", depth: 100, load: "none" }, basis: "name: squat family", confidence: "high" } },
  { name: /hip (thrust|bridge)|glute (bridge|thrust)|bridge/, out: { profileId: "hip-thrust", params: { elevated: "floor", load: "none", singleLeg: "no" }, basis: "name: hip thrust/ bridge", confidence: "high" } },
  { name: /leg extension|knee extension/, out: { profileId: "leg-extension", params: {}, basis: "name: leg extension", confidence: "high" } },
  { name: /(leg|hamstring) curl|lying curl|seated curl|ball curl|glute.?ham/, out: { profileId: "leg-curl", params: { position: "lying" }, basis: "name: leg curl family", confidence: "high" } },
  { name: /(calf|heel|toe) (raise|press)|donkey calf|tiptoe/, out: { profileId: "calf-raise", params: { position: "standing", load: "none" }, basis: "name: calf raise family", confidence: "high" } },
  { name: /seated calf/, out: { profileId: "calf-raise", params: { position: "seated", load: "machine" }, basis: "name: seated calf raise", confidence: "high" } },
  { name: /adduct(or|ion)|groin(?!.*(stretch|pull))/, out: { profileId: "hip-adduction", params: { motion: "adduction" }, basis: "name: adduction", confidence: "high" } },
  { name: /abduct(or|ion)|lateral band walk|side( |-)?step|hip Abductions?/, out: { profileId: "hip-adduction", params: { motion: "abduction" }, basis: "name: abduction", confidence: "high" } },
  { name: /kickback|donkey kick|rear leg raise|glute( ?kick)?/, out: { profileId: "glute-kickback", params: { motion: "kickback", load: "none" }, basis: "name: glute kickback", confidence: "high" } },
  { name: /fire ?hydrant/, out: { profileId: "glute-kickback", params: { motion: "fire-hydrant", load: "none" }, basis: "name: fire hydrant", confidence: "high" } },
  { name: /glute raise|quadruped hip extension|hip extension/, out: { profileId: "glute-kickback", params: { motion: "raise", load: "none" }, basis: "name: glute raise", confidence: "high" } },
];

/* ------------------------------ اجرای طبقه‌بندی ------------------------------ */

function firstMatch(rules: Rule[], ex: ClassifiableExercise): MappingResult | null {
  for (const rule of rules) {
    if (!rule.name.test(name(ex))) continue;
    if (rule.where && !rule.where(ex)) continue;
    if (rule.not && rule.not(ex)) continue;
    return rule.out;
  }
  return null;
}

function fallback(ex: ClassifiableExercise): MappingResult {
  // نزدیک‌ترین الگوی صادقانه بر اساس الگوی حرکتی/دسته — قابل تفکیک در گزارش
  const p = ex.pattern;
  const cat = ex.category;
  if (p === "squat") return { profileId: "squat", params: { stance: "standard", depth: 100, load: "none" }, basis: "fallback:pattern=squat", confidence: "medium" };
  if (p === "hinge") return { profileId: "hinge", params: { torso: 60, kneeBend: 16, load: eq(ex, "barbell") ? "barbell" : "none" }, basis: "fallback:pattern=hinge", confidence: "medium" };
  if (p === "fly") return { profileId: "fly", params: { position: "floor", load: "dumbbells" }, basis: "fallback:pattern=fly", confidence: "medium" };
  if (p === "raise") return { profileId: "raise", params: { direction: "lateral", load: "dumbbells" }, basis: "fallback:pattern=raise", confidence: "medium" };
  if (p === "calf") return { profileId: "calf-raise", params: { position: "standing", load: "none" }, basis: "fallback:pattern=calf", confidence: "medium" };
  if (p === "knee-extension") return { profileId: "leg-extension", params: {}, basis: "fallback:pattern=knee-extension", confidence: "medium" };
  if (p === "knee-flexion") return { profileId: "leg-curl", params: { position: "lying" }, basis: "fallback:pattern=knee-flexion", confidence: "medium" };
  if (p === "spinal-flexion") return { profileId: "crunch", params: { variant: "crunch" }, basis: "fallback:pattern=spinal-flexion", confidence: "medium" };
  if (p === "core-stability") return { profileId: "plank", params: { variant: "straight" }, basis: "fallback:pattern=core-stability", confidence: "medium" };
  if (p === "stretch") return { profileId: "static-stretch", params: { variant: "standing-forward" }, basis: "fallback:pattern=stretch", confidence: "medium" };
  if (p === "push" || cat === "chest") return { profileId: "bench-press", params: { angle: "flat", load: eq(ex, "dumbbell") ? "dumbbells" : "barbell" }, basis: "fallback:pattern=push", confidence: "medium" };
  if (p === "pull" || cat === "back") return { profileId: "row", params: { position: "bent-over", load: eq(ex, "dumbbell") ? "dumbbells" : "barbell" }, basis: "fallback:pattern=pull", confidence: "medium" };
  if (cat === "shoulders") return { profileId: "raise", params: { direction: "lateral", load: "dumbbells" }, basis: "fallback:category=shoulders", confidence: "medium" };
  if (cat === "biceps") return { profileId: "curl", params: { variant: "standing", load: "dumbbells" }, basis: "fallback:category=biceps", confidence: "medium" };
  if (cat === "triceps") return { profileId: "triceps", params: { variant: "overhead", load: "dumbbells" }, basis: "fallback:category=triceps", confidence: "medium" };
  if (cat === "quads") return { profileId: "squat", params: { stance: "standard", depth: 100, load: "none" }, basis: "fallback:category=quads", confidence: "medium" };
  if (cat === "hamstrings") return { profileId: "leg-curl", params: { position: "lying" }, basis: "fallback:category=hamstrings", confidence: "medium" };
  if (cat === "glutes") return { profileId: "hip-thrust", params: { elevated: "floor", load: "none", singleLeg: "no" }, basis: "fallback:category=glutes", confidence: "medium" };
  if (cat === "calves") return { profileId: "calf-raise", params: { position: "standing", load: "none" }, basis: "fallback:category=calves", confidence: "medium" };
  if (cat === "core") return { profileId: "crunch", params: { variant: "crunch" }, basis: "fallback:category=core", confidence: "medium" };
  if (cat === "fullbody") return { profileId: "cardio", params: { variant: "burpee" }, basis: "fallback:category=fullbody", confidence: "medium" };
  return { profileId: "cardio", params: { variant: "march" }, basis: "fallback:default", confidence: "medium" };
}

/** طبقه‌بندی کامل — نگاشت دستی → قواعد بر اساس نوع تمرین → قواعد عمومی → fallback */
export function classify(ex: ClassifiableExercise): MappingResult {
  const override = MANUAL_OVERRIDES[ex.id];
  if (override) return override;

  // قواعد کلیدواژه‌ای سراسری — نام‌های کاملاً مشخص، قبل از تقسیم نوعی
  const special = firstMatch(SPECIAL_NAME_RULES, ex);
  if (special) return special;

  // کشش — بر اساس نوع تمرین یا الگو
  if (ex.exerciseType === "stretching" || ex.pattern === "stretch") {
    const r = firstMatch(STRETCH_RULES, ex);
    if (r) return r;
    return { profileId: "static-stretch", params: { variant: "standing-forward" }, basis: "fallback:stretching-type→static-stretch", confidence: "medium" };
  }
  // هوازی
  if (ex.exerciseType === "cardio") {
    const r = firstMatch(CARDIO_RULES, ex);
    if (r) return r;
    return { profileId: "cardio", params: { variant: "march" }, basis: "fallback:cardio-type→march", confidence: "medium" };
  }
  // پلایومتریک
  if (ex.exerciseType === "plyometrics") {
    const r = firstMatch(PLYO_RULES, ex);
    if (r) return r;
    return { profileId: "plyo", params: { variant: "vertical-jump" }, basis: "fallback:plyo-type→vertical-jump", confidence: "medium" };
  }
  // المپیک
  if (ex.exerciseType === "olympic_weightlifting") {
    const r = firstMatch(OLYMPIC_RULES, ex);
    if (r) return r;
    return { profileId: "olympic", params: { variant: "clean" }, basis: "fallback:olympic-type→clean", confidence: "medium" };
  }
  // استرونگمن
  if (ex.exerciseType === "strongman") {
    const r = firstMatch(STRONGMAN_RULES, ex);
    if (r) return r;
    return { profileId: "strongman", params: { variant: "carry" }, basis: "fallback:strongman-type→carry", confidence: "medium" };
  }

  // قواعد عمومی به ترتیب اولویت: مرکزی → پرس → سرشانه → پول → بازو → پا
  const ordered: [string, Rule[]][] = [
    ["core", CORE_RULES],
    ["push", PUSH_RULES],
    ["shoulder", SHOULDER_RULES],
    ["pull", PULL_RULES],
    ["arm", ARM_RULES],
    ["leg", LEG_RULES],
  ];
  // اول قاعده مرتبط با دسته حرکت
  const catToGroup: Record<string, string> = {
    core: "core",
    chest: "push",
    shoulders: "shoulder",
    back: "pull",
    biceps: "arm",
    triceps: "arm",
    quads: "leg",
    hamstrings: "leg",
    glutes: "leg",
    calves: "leg",
    fullbody: "leg",
  };
  const primaryGroup = catToGroup[ex.category];
  if (primaryGroup) {
    const rules = ordered.find(([g]) => g === primaryGroup);
    if (rules) {
      const r = firstMatch(rules[1], ex);
      if (r) return r;
    }
  }
  for (const [, rules] of ordered) {
    const r = firstMatch(rules, ex);
    if (r) return r;
  }
  return fallback(ex);
}
