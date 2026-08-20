export const promptKinds = ["blog", "email", "code", "image"] as const;
export const promptLocales = ["en", "zu", "xh"] as const;
export type PromptKind = (typeof promptKinds)[number];
export type PromptLocale = (typeof promptLocales)[number];

export type PromptTemplate = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  kind: PromptKind;
  category: string;
  locale: PromptLocale;
};

function starter(id: string, title: string, kind: PromptKind, category: string, prompt: string, locale: PromptLocale): PromptTemplate {
  return { id, title, description: title, kind, category, prompt, locale };
}

const english: PromptTemplate[] = [
  starter("blog-market-insight", "Market insight article", "blog", "Marketing", "Write a practical blog post for [AUDIENCE] about [TOPIC]. Open with a relatable local context, explain three useful insights with examples, and close with one action readers can take today. Use a warm, clear, credible voice.", "en"),
  starter("blog-founder-story", "Founder story", "blog", "Business", "Create a compelling founder story for [BUSINESS]. Explain the problem that inspired it, the people it serves, and the vision for its next chapter. Keep it authentic, specific, and suitable for a website blog.", "en"),
  starter("email-client-update", "Client project update", "email", "Business", "Draft a concise client update about [PROJECT]. Include progress made, the next milestone, any decision needed from the client, and a friendly closing. Keep the tone calm, accountable, and easy to scan.", "en"),
  starter("email-launch-invite", "Launch invitation", "email", "Marketing", "Write an engaging launch invitation for [OFFER OR EVENT] aimed at [AUDIENCE]. Include a clear benefit, date or availability, a short call to action, and an enthusiastic but credible tone.", "en"),
  starter("code-api-endpoint", "Production API endpoint", "code", "Engineering", "Design and implement a production-ready [STACK] API endpoint for [FEATURE]. Include validation, authentication or authorization assumptions, error handling, data model considerations, tests, and brief setup instructions.", "en"),
  starter("code-dashboard-feature", "Dashboard feature", "code", "Engineering", "Build a polished [STACK] dashboard feature for [USE CASE]. Include typed data contracts, loading, empty, and error states, responsive layout, accessibility notes, and tests for the critical behavior.", "en"),
  starter("image-product-scene", "Editorial product scene", "image", "Visuals", "Create an editorial product image for [PRODUCT] in a [SETTING] setting. Use [COLOUR PALETTE], natural directional light, refined composition, and enough negative space for optional campaign copy. Avoid visible logos and text.", "en"),
  starter("image-community-campaign", "Community campaign image", "image", "Visuals", "Generate an authentic campaign image celebrating [COMMUNITY OR MOMENT]. Show diverse people naturally engaged in [ACTIVITY], with an optimistic documentary feel, warm South African light, and no overlaid text.", "en"),
  starter("blog-how-to-guide", "Helpful how-to guide", "blog", "Education", "Write a practical step-by-step guide that helps [AUDIENCE] achieve [OUTCOME]. Start by naming the common challenge, explain the process in clear stages, add realistic tips, and finish with a concise checklist.", "en"),
  starter("blog-customer-questions", "Answer common questions", "blog", "Business", "Write an FAQ-style article for [BUSINESS] that answers the most important questions about [TOPIC]. Be transparent, plain-spoken, and specific. Include a short introduction and a useful next step.", "en"),
  starter("email-welcome-series", "Welcome email", "email", "Marketing", "Write a friendly welcome email for someone who has just joined [BRAND OR COMMUNITY]. Thank them, state what they can expect, offer one genuinely useful resource, and invite a low-pressure next action.", "en"),
  starter("email-payment-reminder", "Payment reminder", "email", "Business", "Write a polite payment reminder for invoice [INVOICE NUMBER] due on [DATE]. State the amount, include a clear payment action, preserve a respectful relationship, and offer help if there is a problem.", "en"),
  starter("code-form-flow", "Validated form flow", "code", "Engineering", "Implement a complete [STACK] form flow for [USE CASE]. Include schema validation, accessible labels and error messages, loading and success states, secure server handling, and automated tests.", "en"),
  starter("code-data-model", "Data model design", "code", "Engineering", "Design a maintainable data model for [PRODUCT OR FEATURE] using [STACK]. Define entities, relationships, constraints, indexes, privacy considerations, migration steps, and example queries.", "en"),
  starter("image-brand-portrait", "Founder brand portrait", "image", "Brand", "Create an editorial brand portrait of [PERSON OR ROLE] in [LOCATION OR SETTING]. Use natural, flattering light, a confident relaxed expression, authentic wardrobe details, and a polished but human documentary style. No text or logos.", "en"),
  starter("image-social-series", "Social campaign visual", "image", "Marketing", "Create a distinctive social campaign visual for [CAMPAIGN]. Convey [KEY FEELING OR BENEFIT] through a strong central subject, [COLOUR PALETTE], editorial lighting, and balanced negative space for optional copy. Do not add text.", "en"),
];

const isiZulu: PromptTemplate[] = [
  starter("blog-market-insight-zu", "Isihloko sokuqonda imakethe", "blog", "Ukumaketha", "Bhala ibhulogi esebenzayo yabantu [AUDIENCE] ngesihloko [TOPIC]. Qala ngomongo wasendaweni abantu abangawuqonda, chaza imibono emithathu ewusizo ngezibonelo, bese uvala ngesenzo esisodwa abafundi abangasenze namuhla. Sebenzisa izwi elifudumele, elicacile nelithembekile.", "zu"),
  starter("blog-founder-story-zu", "Indaba yomsunguli", "blog", "Ibhizinisi", "Dala indaba ehehayo yomsunguli ye-[BUSINESS]. Chaza inkinga eyayiyikhuthaza, abantu elibasebenzelayo, nombono wesahluko sayo esilandelayo. Yigcine iyiqiniso, icacile futhi ifanele ibhulogi yewebhusayithi.", "zu"),
  starter("email-client-update-zu", "Isibuyekezo sephrojekthi yeklayenti", "email", "Ibhizinisi", "Bhala isibuyekezo esifushane sekhasimende mayelana ne-[PROJECT]. Faka inqubekela phambili, ingqophamlando elandelayo, isinqumo esidingekayo, nokuvala okunobungane. Gcina ithoni izolile, inesibopho futhi kulula ukuyifunda.", "zu"),
  starter("email-launch-invite-zu", "Isimemo sokwethulwa", "email", "Ukumaketha", "Bhala isimemo esihehayo sokwethulwa kwe-[OFFER OR EVENT] esiqondiswe ku-[AUDIENCE]. Faka inzuzo ecacile, usuku noma ukutholakala, isimemo esifushane sokuthatha isinyathelo, nethoni enomdlandla kodwa ethembekile.", "zu"),
  starter("code-api-endpoint-zu", "I-endpoint ye-API elungele ukukhiqizwa", "code", "Ubunjiniyela", "Dizayina futhi usebenzise i-endpoint ye-API ye-[STACK] elungele ukukhiqizwa ye-[FEATURE]. Faka ukuqinisekiswa, izimiso zokungena noma zemvume, ukuphathwa kwamaphutha, idatha, ukuhlola, nemiyalelo emifushane yokusetha.", "zu"),
  starter("code-dashboard-feature-zu", "Isici sedeshibhodi", "code", "Ubunjiniyela", "Yakha isici sedeshibhodi se-[STACK] esiphucuziwe se-[USE CASE]. Faka izinkontileka zedatha ezibhalwe kahle, ukulayisha, okungenalutho namaphutha, ukwakheka okuzivumelanisa nesikrini, ukufinyeleleka, nokuhlola okubalulekile.", "zu"),
  starter("image-product-scene-zu", "Isithombe somkhiqizo sokuhlela", "image", "Izithombe", "Dala isithombe somkhiqizo sokuhlela se-[PRODUCT] endaweni ye-[SETTING]. Sebenzisa [COLOUR PALETTE], ukukhanya kwemvelo okuqondile, ukwakheka okucwengekile, nesikhala esanele samagama omkhankaso. Gwema amalogo nombhalo obonakalayo.", "zu"),
  starter("image-community-campaign-zu", "Isithombe somkhankaso womphakathi", "image", "Izithombe", "Khiqiza isithombe somkhankaso esiyiqiniso esigubha [COMMUNITY OR MOMENT]. Bonisa abantu abahlukene bematasa ngokwemvelo ku-[ACTIVITY], ngomuzwa wedokhumentari onethemba, ukukhanya okufudumele kwaseNingizimu Afrika, futhi kungabi nombhalo phezu kwesithombe.", "zu"),
  starter("blog-how-to-guide-zu", "Umhlahlandlela onosizo", "blog", "Imfundo", "Bhala umhlahlandlela osebenzayo wesinyathelo ngesinyathelo osiza [AUDIENCE] afinyelele ku-[OUTCOME]. Qala ngokuchaza inselelo evamile, chaza inqubo ngezigaba ezicacile, engeza amathiphu angokoqobo, bese uqeda ngohlu lokuhlola olufushane.", "zu"),
  starter("blog-customer-questions-zu", "Phendula imibuzo evamile", "blog", "Ibhizinisi", "Bhala indatshana yemibuzo evamile ye-[BUSINESS] ephendula imibuzo ebaluleke kakhulu ngo-[TOPIC]. Caca, khuluma ngendlela elula futhi ucacise imininingwane. Faka isingeniso esifushane nesinyathelo esiwusizo esilandelayo.", "zu"),
  starter("email-welcome-series-zu", "I-imeyili yokwamukela", "email", "Ukumaketha", "Bhala i-imeyili yokwamukela enobungane yomuntu osanda kujoyina [BRAND OR COMMUNITY]. Mbonge, chaza angakulindela, mnikeze insiza eyodwa ewusizo, futhi umeme esinyathelweni esingacindezeli.", "zu"),
  starter("email-payment-reminder-zu", "Isikhumbuzi senkokhelo", "email", "Ibhizinisi", "Bhala isikhumbuzi senkokhelo esinesizotha se-invoyisi [INVOICE NUMBER] okufanele ikhokhwe ngo-[DATE]. Cacisa inani, faka indlela ecacile yokukhokha, gcina ubudlelwano obunenhlonipho, futhi unikeze usizo uma kunenkinga.", "zu"),
  starter("code-form-flow-zu", "Ukugeleza kwefomu eliqinisekisiwe", "code", "Ubunjiniyela", "Sebenzisa ukugeleza kwefomu okuphelele kwe-[STACK] kwe-[USE CASE]. Faka ukuqinisekiswa kwesikimu, amalebula afinyelelekayo nemiyalezo yamaphutha, ukulayisha nempumelelo, ukuphathwa okuvikelekile kweseva, nokuhlola okuzenzakalelayo.", "zu"),
  starter("code-data-model-zu", "Ukuklanywa kwemodeli yedatha", "code", "Ubunjiniyela", "Dizayina imodeli yedatha elondolozekayo ye-[PRODUCT OR FEATURE] usebenzisa i-[STACK]. Chaza izinhlangano, ubudlelwano, imikhawulo, ama-index, izici zobumfihlo, izinyathelo zokufuduka, nemibuzo eyisibonelo.", "zu"),
  starter("image-brand-portrait-zu", "Isithombe somsunguli somkhiqizo", "image", "Umkhiqizo", "Dala isithombe sokuhlela somkhiqizo sika-[PERSON OR ROLE] e-[LOCATION OR SETTING]. Sebenzisa ukukhanya kwemvelo okuhle, ukubukeka okuqinisekile nokukhululekile, imininingwane yezingubo eyiqiniso, nesitayela sedokhumentari esiphucuziwe kodwa esingumuntu. Akube nombhalo noma amalogo.", "zu"),
  starter("image-social-series-zu", "Isithombe somkhankaso wezokuxhumana", "image", "Ukumaketha", "Dala isithombe somkhankaso wezokuxhumana esihlukile se-[CAMPAIGN]. Dlulisa [KEY FEELING OR BENEFIT] ngesihloko esimaphakathi esiqinile, [COLOUR PALETTE], ukukhanya kokuhlela, nesikhala esilinganiselayo samagama. Ungafaki umbhalo.", "zu"),
];

const isiXhosa: PromptTemplate[] = [
  starter("blog-market-insight-xh", "Inqaku lolwazi lwemarike", "blog", "Urhwebo", "Bhala inqaku lebhlogi elisebenzayo labantu [AUDIENCE] malunga ne-[TOPIC]. Qala ngomxholo wasekuhlaleni oqhelekileyo, chaza iimbono ezintathu eziluncedo ngemizekelo, uze uvale ngesenzo esinye abanokusenza abafundi namhlanje. Sebenzisa ilizwi elifudumeleyo, elicacileyo nelithembekileyo.", "xh"),
  starter("blog-founder-story-xh", "Ibali lomsunguli", "blog", "Ishishini", "Yila ibali elitsalayo lomsunguli we-[BUSINESS]. Cacisa ingxaki eyayiyikhuthaza, abantu elibasebenzelayo, nombono wesahluko esilandelayo. Ligcine liyinyani, licacile kwaye lifanele ibhlogi yewebhusayithi.", "xh"),
  starter("email-client-update-xh", "Uhlaziyo lweprojekthi yomxhasi", "email", "Ishishini", "Bhala uhlaziyo olufutshane lomxhasi malunga ne-[PROJECT]. Faka inkqubela eyenziweyo, isiganeko esilandelayo, isigqibo esifunekayo kumxhasi, nokuvala okunobuhlobo. Gcina ithoni izolile, inoxanduva kwaye kulula ukuyifunda.", "xh"),
  starter("email-launch-invite-xh", "Isimemo sokwazisa", "email", "Urhwebo", "Bhala isimemo esitsalayo sokwazisa [OFFER OR EVENT] esijoliswe ku-[AUDIENCE]. Faka inzuzo ecacileyo, umhla okanye ukufumaneka, isimemo esifutshane sokwenza into, kunye nethoni enomdla kodwa ethembekileyo.", "xh"),
  starter("code-api-endpoint-xh", "I-endpoint ye-API elungele imveliso", "code", "Ubunjineli", "Yila uze uphumeze i-endpoint ye-API ye-[STACK] elungele imveliso ye-[FEATURE]. Faka uqinisekiso, iingcinga zokungena okanye ugunyaziso, ukuphathwa kweempazamo, imodeli yedatha, uvavanyo, nemiyalelo emifutshane yokuseta.", "xh"),
  starter("code-dashboard-feature-xh", "Inqaku ledashibhodi", "code", "Ubunjineli", "Yakha inqaku ledashibhodi ye-[STACK] ephucukileyo ye-[USE CASE]. Faka izivumelwano zedatha ezibhalwe kakuhle, ukulayisha, ukungabikho kwedatha neempazamo, uyilo oluhambelana nezikrini, ukufikeleleka, kunye novavanyo olubalulekileyo.", "xh"),
  starter("image-product-scene-xh", "Umfanekiso wemveliso wohlelo", "image", "Imifanekiso", "Yila umfanekiso wemveliso wohlelo we-[PRODUCT] kwindawo ye-[SETTING]. Sebenzisa [COLOUR PALETTE], ukukhanya kwendalo okuqondileyo, ukwakheka okucokisekileyo, nendawo eyaneleyo yamagama omkhankaso. Kuphephe iilogo nombhalo obonakalayo.", "xh"),
  starter("image-community-campaign-xh", "Umfanekiso womkhankaso woluntu", "image", "Imifanekiso", "Yenza umfanekiso womkhankaso oyinyani obhiyozela [COMMUNITY OR MOMENT]. Bonisa abantu abohlukeneyo bethatha inxaxheba ngokwendalo ku-[ACTIVITY], ngesimbo sedokhumentari esinethemba, ukukhanya okufudumeleyo kwaseMzantsi Afrika, kwaye ungafaki mbhalo phezu komfanekiso.", "xh"),
  starter("blog-how-to-guide-xh", "Isikhokelo esiluncedo", "blog", "Imfundo", "Bhala isikhokelo esisebenzayo senyathelo nenyathelo esinceda [AUDIENCE] afikelele ku-[OUTCOME]. Qala ngokubiza umngeni oqhelekileyo, chaza inkqubo ngokucacileyo, yongeza iingcebiso eziyinyani, uze ugqibe ngoluhlu lokujonga olufutshane.", "xh"),
  starter("blog-customer-questions-xh", "Phendula imibuzo eqhelekileyo", "blog", "Ishishini", "Bhala inqaku lemibuzo edla ngokubuzwa le-[BUSINESS] eliphendula imibuzo ebaluleke kakhulu ngo-[TOPIC]. Caca, thetha ngokulula, kwaye ucacise. Faka intshayelelo emfutshane kunye nenyathelo eliluncedo elilandelayo.", "xh"),
  starter("email-welcome-series-xh", "I-imeyili yokwamkela", "email", "Urhwebo", "Bhala i-imeyili yokwamkela enobuhlobo yomntu osandul’ ukujoyina [BRAND OR COMMUNITY]. Mbulele, chaza into anokuyilindela, mnike isixhobo esinye esiluncedo, uze umemele kwisenzo esinganyanzelisiyo.", "xh"),
  starter("email-payment-reminder-xh", "Isikhumbuzi sentlawulo", "email", "Ishishini", "Bhala isikhumbuzi sentlawulo esinembeko se-invoyisi [INVOICE NUMBER] emele ihlawulwe ngo-[DATE]. Chaza imali, faka inyathelo elicacileyo lentlawulo, gcina ubudlelwane obunentlonipho, uze unike uncedo xa kukho ingxaki.", "xh"),
  starter("code-form-flow-xh", "Ukuhamba kwefomu okuqinisekisiweyo", "code", "Ubunjineli", "Phumeza ukuhamba kwefomu okupheleleyo kwe-[STACK] ye-[USE CASE]. Faka uqinisekiso lwesikimu, iilebhile ezifikelelekayo nemiyalezo yeempazamo, ukulayisha nempumelelo, ukuphathwa okukhuselekileyo kweseva, kunye novavanyo oluzenzekelayo.", "xh"),
  starter("code-data-model-xh", "Uyilo lwemodeli yedatha", "code", "Ubunjineli", "Yila imodeli yedatha egcinakalayo ye-[PRODUCT OR FEATURE] usebenzisa i-[STACK]. Chaza izakhi, ubudlelwane, izithintelo, ii-index, imiba yabucala, amanyathelo okufuduka, nemibuzo eyisampulu.", "xh"),
  starter("image-brand-portrait-xh", "Umfanekiso womsunguli wophawu", "image", "Uphawu", "Yila umfanekiso wohlelo wophawu luka-[PERSON OR ROLE] e-[LOCATION OR SETTING]. Sebenzisa ukukhanya kwendalo okuncomekayo, uncumo oluqinisekileyo nolukhululekileyo, iinkcukacha zempahla eziyinyani, nesimbo sedokhumentari esicokisekileyo kodwa sobuntu. Ungafaki mbhalo okanye iilogo.", "xh"),
  starter("image-social-series-xh", "Umfanekiso womkhankaso wentlalo", "image", "Urhwebo", "Yila umfanekiso owahlukileyo womkhankaso wentlalo we-[CAMPAIGN]. Dlulisa [KEY FEELING OR BENEFIT] ngomxholo ophambili oqinileyo, [COLOUR PALETTE], ukukhanya kohlelo, nendawo elinganiselweyo yamagama. Musa ukufaka mbhalo.", "xh"),
];

export const promptTemplates = [...english, ...isiZulu, ...isiXhosa];

export function filterPromptTemplates(input: { query?: string; kind?: PromptKind; locale?: PromptLocale } = {}) {
  const query = input.query?.trim().toLocaleLowerCase() ?? "";
  const locale = input.locale ?? "en";
  return promptTemplates.filter(template => {
    const matchesKind = !input.kind || template.kind === input.kind;
    const haystack = `${template.title} ${template.description} ${template.category} ${template.prompt}`.toLocaleLowerCase();
    return template.locale === locale && matchesKind && (!query || haystack.includes(query));
  });
}

export function togglePromptFavouriteIds(currentIds: ReadonlySet<string>, promptId: string) {
  const nextIds = new Set(currentIds);
  const isFavorite = !nextIds.delete(promptId);
  if (isFavorite) nextIds.add(promptId);
  return { isFavorite, ids: nextIds };
}
