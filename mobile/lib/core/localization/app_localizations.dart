class AppLocalizations {
  final String languageCode;

  AppLocalizations(this.languageCode);

  static final Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'app_title': 'CitizenAlert Ghana',
      'record_evidence': 'Record 60s Evidence',
      'max_duration': 'Max 60 Seconds',
      'sos_panic': 'EMERGENCY SOS',
      'anonymous_mode': 'Anonymous Whistleblower',
      'safety_warning': 'DO NOT CONFRONT OFFENDERS. Stay in a safe location.',
      'category_crime': 'Crime / Armed Robbery',
      'category_domestic': 'Domestic / Child Abuse',
      'category_galamsey': 'Illegal Mining / Galamsey',
      'category_traffic': 'Reckless Driving',
      'submit_report': 'Submit Incident Report',
      'offline_queued': 'Offline: Saved to Encrypted Queue',
    },
    'tw': { // Asante Twi
      'app_title': 'CitizenAlert Ghana',
      'record_evidence': 'Kyere Adanseɛ (Sekend 60)',
      'max_duration': 'Ɛntra Sekend 60',
      'sos_panic': 'MBOA NTƐM (SOS)',
      'anonymous_mode': 'Kokoamsɛm (Kura Wo Din)',
      'safety_warning': 'Mfa wo ho nhyɛ mu. Gyina baabi a asomdwoeɛ wɔ.',
      'category_crime': 'Nkorɔfo Bɔne / Awudie',
      'category_domestic': 'Efie Abrasɛm / Mmɔfra Ahokyere',
      'category_galamsey': 'Galamsey / Asuo Sɛee',
      'category_traffic': 'Karihyia Kwan So Bɔne',
      'submit_report': 'Mane Amanneɛbɔ No',
      'offline_queued': 'Intanɛt Nni Hɔ: Yɛakora No Yie',
    },
    'ga': { // Ga
      'app_title': 'CitizenAlert Ghana',
      'record_evidence': 'Tsɔɔ Nɔ Ni Eba (Sekɛnd 60)',
      'max_duration': 'Kafee Fe Sekɛnd 60',
      'sos_panic': 'YELIKƐBUAMƆ (SOS)',
      'anonymous_mode': 'Teemɔŋ Sanegbaa',
      'safety_warning': 'Kaatamɔ mɛi lɛ. Damɔ he ni hewalɛ yɔɔ.',
      'category_crime': 'Nisɛɛ Nifeemɔ / Ju',
      'category_domestic': 'Shia Yelikɛbuamɔ',
      'category_galamsey': 'Galamsey / Nu He Nimɔ',
      'category_traffic': 'Lɔle Kudɔmɔ Gbonyo',
      'submit_report': 'Kɛ Sane Lɛ Maje',
      'offline_queued': 'Net Bɛ: Akɛto He Kpakpa',
    },
    'ee': { // Ewe
      'app_title': 'CitizenAlert Ghana',
      'record_evidence': 'Ɖe Kpeɖodzi (Sekend 60)',
      'max_duration': 'Mega Wu Sekend 60 O',
      'sos_panic': 'KPƆXƆXƆ KABA (SOS)',
      'anonymous_mode': 'Ŋkɔ Mado Gblɔ',
      'safety_warning': 'Mègatsɔ wò ɖokui ade afɔku me o.',
      'category_crime': 'Nuflododo / Fifi',
      'category_domestic': 'Aƒeme Fuwɔame',
      'category_galamsey': 'Galamsey / Tɔsisi Gbegblẽ',
      'category_traffic': 'Ʋukuku Vɔ̃ɖi',
      'submit_report': 'Ɖo Nyatakaka Ɖa',
      'offline_queued': 'Net Meli O: Wodzra Eɖo Dedie',
    },
    'ha': { // Hausa
      'app_title': 'CitizenAlert Ghana',
      'record_evidence': 'Ɗauki Shaidar Bidiyo (Daƙiƙa 60)',
      'max_duration': 'Kada Ya Wuce Daƙiƙa 60',
      'sos_panic': 'TAIMAKON GAUGĀWA (SOS)',
      'anonymous_mode': 'Ayyukan Sirri (Kare Suna)',
      'safety_warning': 'Kada ka fuskanci masu laifi. Tsaya a wuri mai aminci.',
      'category_crime': 'Fashi Da Makami / Laifi',
      'category_domestic': 'Cin Zarafin Yara Da Mata',
      'category_galamsey': 'Haƙar Ma\'adinai Ba Ƙa\'ida',
      'category_traffic': 'Tuƙin Ganganci',
      'submit_report': 'Aika Rahoto',
      'offline_queued': 'Babu Intanet: An Ajiye Cikin Sirri',
    }
  };

  String get(String key) {
    return _localizedValues[languageCode]?[key] ?? _localizedValues['en']![key] ?? key;
  }
}
