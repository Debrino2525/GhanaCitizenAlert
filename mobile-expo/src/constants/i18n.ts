import { LanguageCode } from '../types';

export interface TranslationMap {
  appTitle: string;
  recordEvidence: string;
  stopRecording: string;
  snapPhoto: string;
  chooseGallery: string;
  gpsLocked: string;
  gpsLocating: string;
  recalibrateGps: string;
  landmarkLabel: string;
  landmarkPlaceholder: string;
  locationLabel: string;
  ghanaPostLabel: string;
  sosPanic: string;
  anonymous: string;
  submitReport: string;
  safetyNotice: string;
  amberAlert: string;
  categories: string;
}

export const GHANAIAN_LANGUAGES: Record<LanguageCode, TranslationMap> = {
  en: {
    appTitle: 'CitizenAlert Ghana',
    recordEvidence: 'Record 60s Evidence',
    stopRecording: 'Stop Recording',
    snapPhoto: '📸 Snap Photo',
    chooseGallery: '📁 Attach Gallery',
    gpsLocked: 'GPS ACQUIRED (LIVE)',
    gpsLocating: 'ACQUIRING GPS...',
    recalibrateGps: '📍 Refresh GPS',
    landmarkLabel: 'Closest Landmark / Famous Place',
    landmarkPlaceholder: 'e.g. Opposite Shell Gas Station, Behind Melcom, Near Market Gate',
    locationLabel: 'Detected Area / Street Name',
    ghanaPostLabel: 'GhanaPost GPS Digital Code',
    sosPanic: 'EMERGENCY SOS',
    anonymous: 'Anonymous Whistleblower',
    submitReport: 'Transmit Official Report',
    safetyNotice: 'DO NOT CONFRONT SUSPECTS. Observe from a safe distance.',
    amberAlert: 'AMBER ALERT ACTIVE',
    categories: 'Incident Category'
  },
  tw: {
    appTitle: 'CitizenAlert Ghana',
    recordEvidence: 'Kyere Adanseɛ (Sekend 60)',
    stopRecording: 'Gyae Kyerew',
    snapPhoto: '📸 Twa Mfonini',
    chooseGallery: '📁 Fa Mfonini Firi Fon Mu',
    gpsLocked: 'GPS AYƐ KRADO (NTƐM)',
    gpsLocating: 'YƐREHWƐ BEAE...',
    recalibrateGps: '📍 San Fa GPS Foforɔ',
    landmarkLabel: 'Baabi a Ɛbɛn (Ahyɛnsode / Landmark)',
    landmarkPlaceholder: 'e.g. Shell Petrol Beae anim, Melcom akyi, Dwaso pono ano',
    locationLabel: 'Krom / Kwantempon Din',
    ghanaPostLabel: 'GhanaPost GPS Kood',
    sosPanic: 'MBOA NTƐM (SOS)',
    anonymous: 'Kokoamsɛm (Kura Wo Din)',
    submitReport: 'Mane Amanneɛbɔ No',
    safetyNotice: 'Mfa wo ho nhyɛ mu. Gyina baabi a asomdwoeɛ wɔ.',
    amberAlert: 'ABƆFRA AYERA NTƐM',
    categories: 'Amanneɛbɔ Su'
  },
  ga: {
    appTitle: 'CitizenAlert Ghana',
    recordEvidence: 'Tsɔɔ Nɔ Ni Eba (Sekɛnd 60)',
    stopRecording: 'Tsi Sane Lɛ Naa',
    snapPhoto: '📸 Gbee Mfoniri',
    chooseGallery: '📁 Hala Mfoniri',
    gpsLocked: 'GPS EBA AMRO NƐƐ',
    gpsLocating: 'TAOMƆ HE NI OYƆƆ...',
    recalibrateGps: '📍 Hã GPS Tsakemɔ',
    landmarkLabel: 'He Ni Bɛŋkɛ Fe Fɛɛ (Landmark)',
    landmarkPlaceholder: 'e.g. Shell hegbɛ, Melcom sɛɛ, Jaa agbo he',
    locationLabel: 'Maŋ / Gbɛ Gbɛi',
    ghanaPostLabel: 'GhanaPost GPS Kood',
    sosPanic: 'YELIKƐBUAMƆ (SOS)',
    anonymous: 'Teemɔŋ Sanegbaa',
    submitReport: 'Kɛ Sane Lɛ Maje',
    safetyNotice: 'Kaatamɔ mɛi lɛ. Damɔ he ni hewalɛ yɔɔ.',
    amberAlert: 'GBEKE LAJE AMRƆ NƐƐ',
    categories: 'Sane Lɛ Nifeemɔ'
  },
  ee: {
    appTitle: 'CitizenAlert Ghana',
    recordEvidence: 'Ɖe Kpeɖodzi (Sekend 60)',
    stopRecording: 'Dzudzɔ Kpeɖodzi',
    snapPhoto: '📸 Ɖe Nutata',
    chooseGallery: '📁 Tia Nutatawo',
    gpsLocked: 'GPS LE DƆWƆM',
    gpsLocating: 'DI AFISI NÈLE...',
    recalibrateGps: '📍 Gbugbɔ Di GPS',
    landmarkLabel: 'Dzesi Si Te Ðe Afima Ŋu (Landmark)',
    landmarkPlaceholder: 'e.g. Shell Petrol fiaƒe ŋgɔgbe, Melcom megbe, Asifiafe nu',
    locationLabel: 'Nutome / Mɔ ŋkɔ',
    ghanaPostLabel: 'GhanaPost GPS Kood',
    sosPanic: 'KPƆXƆXƆ KABA (SOS)',
    anonymous: 'Ŋkɔ Mado Gblɔ',
    submitReport: 'Ɖo Nyatakaka Ɖa',
    safetyNotice: 'Mègatsɔ wò ɖokui ade afɔku me o.',
    amberAlert: 'ƉEVI BU KABA',
    categories: 'Nyatakaka Ƒomevi'
  },
  ha: {
    appTitle: 'CitizenAlert Ghana',
    recordEvidence: 'Ɗauki Shaidar Bidiyo (Daƙiƙa 60)',
    stopRecording: 'Dakatar da Ɗauka',
    snapPhoto: '📸 Ɗauki Hoto',
    chooseGallery: '📁 Zaɓi Hoto/Bidiyo',
    gpsLocked: 'AN SAMU GPS (KAI TSAYE)',
    gpsLocating: 'ANA NEMAN WURI...',
    recalibrateGps: '📍 Sabunta GPS',
    landmarkLabel: 'Wurin da ke Kusa (Landmark)',
    landmarkPlaceholder: 'e.g. Gaban gidan mai na Shell, Bayan Melcom, Kusa da kasuwa',
    locationLabel: 'Sunan Unguwa / Titin',
    ghanaPostLabel: 'Lambar GhanaPost GPS',
    sosPanic: 'TAIMAKON GAUGĀWA (SOS)',
    anonymous: 'Ayyukan Sirri (Kare Suna)',
    submitReport: 'Aika Rahoto',
    safetyNotice: 'Kada ka fuskanci masu laifi. Tsaya a wuri mai aminci.',
    amberAlert: 'YARO YA ƁACE',
    categories: 'Nau\'in Laifi'
  }
};

export const LANDMARK_SUGGESTIONS = [
  '⛽ Fuel Station',
  '🏪 Near Melcom / Mart',
  '🚦 Traffic Light / Junction',
  '🕌 Mosque / ⛪ Church',
  '🏫 School / Hospital Gate',
  '🚌 Lorry Station / Taxi Rank',
  '🏢 Bank / ATM',
  '🛡️ Police Barrier'
];
