var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/main.ts
__export(exports, {
  default: () => LanguageTranslator
});
var import_obsidian3 = __toModule(require("obsidian"));

// src/settingsTab.ts
var import_obsidian = __toModule(require("obsidian"));

// src/apiTypes.ts
var API_TYPES;
(function(API_TYPES2) {
  API_TYPES2[API_TYPES2["Builtin"] = 0] = "Builtin";
  API_TYPES2[API_TYPES2["Azure"] = 1] = "Azure";
  API_TYPES2[API_TYPES2["LibreTranslate"] = 2] = "LibreTranslate";
})(API_TYPES || (API_TYPES = {}));
var apiTypes_default = API_TYPES;

// src/apiUrls.ts
var API_URLS = {
  AZURE_TRANSLATE_API_URL: "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0",
  LIBRE_TRANSLATE_API_URL: "https://libretranslate.com/translate"
};
var apiUrls_default = API_URLS;

// src/langCodes.ts
var langCodes = [
  { text: "Afrikaans", code: "af" },
  { text: "Albanian", code: "sq" },
  { text: "Amharic", code: "am" },
  { text: "Arabic", code: "ar" },
  { text: "Armenian", code: "hy" },
  { text: "Assamese", code: "as" },
  { text: "Azerbaijani", code: "" },
  { text: "Bangla", code: "bn" },
  { text: "Bashkir", code: "ba" },
  { text: "Bosnian (Latin)", code: "bs" },
  { text: "Bulgarian", code: "bg" },
  { text: "Cantonese (Traditional)", code: "yue" },
  { text: "Catalan", code: "ca" },
  { text: "Chinese (Literary)", code: "lzh" },
  { text: "Chinese Simplified", code: "zh-Hans" },
  { text: "Chinese Traditional", code: "zh-Hant" },
  { text: "Croatian", code: "hr" },
  { text: "Czech", code: "cs" },
  { text: "Danish", code: "da" },
  { text: "Dari", code: "prs" },
  { text: "Divehi", code: "dv" },
  { text: "Dutch", code: "nl" },
  { text: "English", code: "en" },
  { text: "Estonian", code: "et" },
  { text: "Fijian", code: "fj" },
  { text: "Filipino", code: "fil" },
  { text: "Finnish", code: "fi" },
  { text: "French", code: "fr" },
  { text: "French (Canada)", code: "fr-ca" },
  { text: "Georgian", code: "ka" },
  { text: "German", code: "de" },
  { text: "Greek", code: "el" },
  { text: "Gujarati", code: "gu" },
  { text: "Haitian Creole", code: "ht" },
  { text: "Hebrew", code: "he" },
  { text: "Hindi", code: "hi" },
  { text: "Hmong Daw", code: "mww" },
  { text: "Hungarian", code: "hu" },
  { text: "Icelandic", code: "is" },
  { text: "Indonesian", code: "id" },
  { text: "Inuktitut", code: "iu" },
  { text: "Irish", code: "ga" },
  { text: "Italian", code: "it" },
  { text: "Japanese", code: "ja" },
  { text: "Kannada", code: "kn" },
  { text: "Kazakh", code: "kk" },
  { text: "Khmer", code: "km" },
  { text: "Klingon", code: "tlh-Latn" },
  { text: "Klingon (plqaD)", code: "tlh-Piqd" },
  { text: "Korean", code: "ko" },
  { text: "Kurdish (Central)", code: "ku" },
  { text: "Kurdish (Northern)", code: "kmr" },
  { text: "Kyrgyz", code: "ky" },
  { text: "Lao", code: "lo" },
  { text: "Latvian", code: "lv" },
  { text: "Lithuanian", code: "lt" },
  { text: "Macedonian", code: "mk" },
  { text: "Malagasy", code: "mg" },
  { text: "Malay", code: "ms" },
  { text: "Malayalam", code: "ml" },
  { text: "Maltese", code: "mt" },
  { text: "Maori", code: "mi" },
  { text: "Marathi", code: "mr" },
  { text: "Mongolian (Cyrillic)", code: "mn-Cyrl" },
  { text: "Mongolian (Traditional)", code: "mn-Mong" },
  { text: "Myanmar", code: "my" },
  { text: "Nepali", code: "ne" },
  { text: "Norwegian", code: "nb" },
  { text: "Odia", code: "or" },
  { text: "Pashto", code: "ps" },
  { text: "Persian", code: "fa" },
  { text: "Polish", code: "pl" },
  { text: "Portuguese (Brazil)", code: "pt" },
  { text: "Portuguese (Portugal)", code: "pt-pt" },
  { text: "Punjabi", code: "pa" },
  { text: "Queretaro Otomi", code: "otq" },
  { text: "Romanian", code: "ro" },
  { text: "Russian", code: "ru" },
  { text: "Samoan", code: "sm" },
  { text: "Serbian (Cyrillic)", code: "sr-Cyrl" },
  { text: "Serbian (Latin)", code: "sr-Latn" },
  { text: "Slovak", code: "sk" },
  { text: "Slovenian", code: "sl" },
  { text: "Spanish", code: "es" },
  { text: "Swahili", code: "sw" },
  { text: "Swedish", code: "sv" },
  { text: "Tahitian", code: "ty" },
  { text: "Tamil", code: "ta" },
  { text: "Tatar", code: "tt" },
  { text: "Telugu", code: "te" },
  { text: "Thai", code: "th" },
  { text: "Tibetan", code: "bo" },
  { text: "Tigrinya", code: "ti" },
  { text: "Tongan", code: "to" },
  { text: "Turkish", code: "tr" },
  { text: "Turkmen", code: "tk" },
  { text: "Ukrainian", code: "uk" },
  { text: "Urdu", code: "ur" },
  { text: "Uyghur", code: "ug" },
  { text: "Uzbek (Latin)", code: "uz" },
  { text: "Vietnamese", code: "vi" },
  { text: "Welsh", code: "cy" },
  { text: "Yucatec Maya", code: "yua" }
];
var langCodes_default = langCodes;

// src/regions.ts
var regions = [
  { text: "Global", code: "global" },
  { text: "East Asia", code: "eastasia" },
  { text: "Southeast Asia", code: "southeastasia" },
  { text: "Central US", code: "centralus" },
  { text: "East US", code: "eastus" },
  { text: "East US 2", code: "eastus2" },
  { text: "West US", code: "westus" },
  { text: "North Central US", code: "northcentralus" },
  { text: "South Central US", code: "southcentralus" },
  { text: "North Europe", code: "northeurope" },
  { text: "West Europe", code: "westeurope" },
  { text: "Japan West", code: "japanwest" },
  { text: "Japan East", code: "japaneast" },
  { text: "Brazil South", code: "brazilsouth" },
  { text: "Australia East", code: "australiaeast" },
  { text: "Australia Southeast", code: "australiasoutheast" },
  { text: "South India", code: "southindia" },
  { text: "Central India", code: "centralindia" },
  { text: "West India", code: "westindia" },
  { text: "Canada Central", code: "canadacentral" },
  { text: "Canada East", code: "canadaeast" },
  { text: "UK South", code: "uksouth" },
  { text: "UK West", code: "ukwest" },
  { text: "West Central US", code: "westcentralus" },
  { text: "West US 2", code: "westus2" },
  { text: "Korea Central", code: "koreacentral" },
  { text: "Korea South", code: "koreasouth" },
  { text: "France Central", code: "francecentral" },
  { text: "France South", code: "francesouth" },
  { text: "Australia Central", code: "australiacentral" },
  { text: "Australia Central 2", code: "australiacentral2" },
  { text: "UAE Central", code: "uaecentral" },
  { text: "UAE North", code: "uaenorth" },
  { text: "South Africa North", code: "southafricanorth" },
  { text: "South Africa West", code: "southafricawest" },
  { text: "Switzerland North", code: "switzerlandnorth" },
  { text: "Switzerland West", code: "switzerlandwest" },
  { text: "Germany North", code: "germanynorth" },
  { text: "Germany West Central", code: "germanywestcentral" },
  { text: "Norway West", code: "norwaywest" },
  { text: "Norway East", code: "norwayeast" }
];
var regions_default = regions;

// src/settingsTab.ts
var apiEntries = [
  {
    text: "Builtin",
    value: "0"
  },
  {
    text: "Azure",
    value: "1"
  },
  {
    text: "LibreTranslate",
    value: "2"
  }
];
var LanguageTranslatorSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Language Translator Settings" });
    new import_obsidian.Setting(containerEl).setName("Target Language").setDesc("Set the translation target language (automatically detects source language)").addDropdown((dropDown) => {
      langCodes_default.forEach((el) => {
        dropDown.addOption(el.code, el.text);
      });
      dropDown.onChange((value) => __async(this, null, function* () {
        this.plugin.settings.targetLanguage = langCodes_default.find((l) => l.code == value);
        yield this.plugin.saveSettings();
      }));
      dropDown.setValue(this.plugin.settings.targetLanguage.code);
    });
    new import_obsidian.Setting(containerEl).setName("Translator API Type").setDesc("Set preferred API").addDropdown((dropDown) => {
      apiEntries.forEach((el) => {
        dropDown.addOption(el.value, el.text);
      });
      dropDown.onChange((value) => __async(this, null, function* () {
        this.plugin.settings.apiType = apiEntries.find((a) => a.value == value);
        switch (Number(value)) {
          case apiTypes_default.Builtin:
          case apiTypes_default.Azure:
            this.plugin.settings.translateApiUrl = apiUrls_default.AZURE_TRANSLATE_API_URL;
            this.apiUrlTextSetting.setValue(apiUrls_default.AZURE_TRANSLATE_API_URL);
            this.plugin.settings.region = {
              text: "Global",
              code: "global"
            };
            break;
          case apiTypes_default.LibreTranslate:
            this.plugin.settings.translateApiUrl = apiUrls_default.LIBRE_TRANSLATE_API_URL;
            this.apiUrlTextSetting.setValue(apiUrls_default.LIBRE_TRANSLATE_API_URL);
            break;
          default:
            this.plugin.settings.translateApiUrl = apiUrls_default.AZURE_TRANSLATE_API_URL;
            this.apiUrlTextSetting.setValue(apiUrls_default.AZURE_TRANSLATE_API_URL);
            break;
        }
        yield this.plugin.saveSettings();
      }));
      dropDown.setValue(this.plugin.settings.apiType.value);
    });
    new import_obsidian.Setting(containerEl).setName("Azure Translator Region").setDesc("Set regions").addDropdown((dropDown) => {
      regions_default.forEach((el) => {
        dropDown.addOption(el.code, el.text);
      });
      dropDown.onChange((value) => __async(this, null, function* () {
        this.plugin.settings.region = regions_default.find((l) => l.code == value);
        yield this.plugin.saveSettings();
      }));
      dropDown.setValue(this.plugin.settings.region.code);
    });
    new import_obsidian.Setting(containerEl).setName("API Url").addTextArea((text) => {
      text.setPlaceholder("Enter url").setValue(this.plugin.settings.translateApiUrl).onChange((value) => __async(this, null, function* () {
        console.log("New api url: " + value);
        this.plugin.settings.translateApiUrl = value;
        yield this.plugin.saveSettings();
      }));
      text.setValue(this.plugin.settings.translateApiUrl);
      text.inputEl.setAttr("rows", 4);
      text.inputEl.addClass("settings_area");
      this.apiUrlTextSetting = text;
    });
    new import_obsidian.Setting(containerEl).setName("API Token").addText((text) => {
      text.setPlaceholder("Enter token").setValue(this.plugin.settings.token).onChange((value) => __async(this, null, function* () {
        this.plugin.settings.token = value;
        yield this.plugin.saveSettings();
      }));
      text.setValue(this.plugin.settings.token);
    });
  }
};

// src/translationServiceImplementation.ts
var import_obsidian2 = __toModule(require("obsidian"));

// src/translation.ts
function getTextLibreTranslate(text, lang, token, translateApiUrl) {
  return __async(this, null, function* () {
    let res = "";
    const payload = JSON.stringify({
      q: text,
      source: "auto",
      target: lang,
      format: "text",
      api_key: token
    });
    const myHeaders = new Headers({
      "Content-type": "application/json"
    });
    try {
      const response = yield fetch(translateApiUrl, {
        method: "POST",
        body: payload,
        headers: myHeaders
      });
      let jsonResponse = yield response.json();
      res = jsonResponse.translatedText || jsonResponse.error;
    } catch (err) {
      console.error(err);
    }
    return res;
  });
}
function getTextAzure(text, lang, region, token, translateApiUrl) {
  return __async(this, null, function* () {
    let res = "";
    const payload = JSON.stringify([{ text }]);
    const myHeaders = new Headers({
      "Ocp-Apim-Subscription-Key": token,
      "Ocp-Apim-Subscription-Region": region,
      "Content-type": "application/json"
    });
    try {
      const response = yield fetch(`${translateApiUrl}&to=${lang}`, {
        method: "POST",
        body: payload,
        headers: myHeaders
      });
      const json = yield response.json();
      if (json.error) {
        res = json.error.message;
      } else {
        res = json[0].translations[0].text;
      }
    } catch (err) {
      console.error(err);
    }
    return res;
  });
}

// src/translationServiceImplementation.ts
var AZURE_BUILTIN_KEY = "0bb27e8d40864db0a9854d8793e4fbb7";
var TranslationServiceImplementation = class {
  constructor(plugin) {
    this.getBuiltinAzureToken = () => __async(this, null, function* () {
      try {
        return AZURE_BUILTIN_KEY;
      } catch (err) {
        console.log(err);
        new import_obsidian2.Notice(err.message);
      }
    });
    this.plugin = plugin;
  }
  translate(lang, text) {
    return __async(this, null, function* () {
      let result = "";
      switch (Number(this.plugin.settings.apiType.value)) {
        case apiTypes_default.Builtin:
          let token = yield this.getBuiltinAzureToken();
          result = yield getTextAzure(text, lang, "westeurope", token, this.plugin.settings.translateApiUrl);
          break;
        case apiTypes_default.Azure:
          result = yield getTextAzure(text, lang, this.plugin.settings.region.code, this.plugin.settings.token, this.plugin.settings.translateApiUrl);
          break;
        case apiTypes_default.LibreTranslate:
          result = yield getTextLibreTranslate(text, lang, this.plugin.settings.token, this.plugin.settings.translateApiUrl);
          break;
      }
      return result;
    });
  }
};

// src/main.ts
var MAX_CHARACTERS = 2e3;
var DEFAULT_SETTINGS = {
  targetLanguage: {
    text: "English",
    code: "en"
  },
  apiType: {
    text: "Builtin",
    value: "0"
  },
  translateApiUrl: apiUrls_default.AZURE_TRANSLATE_API_URL,
  maxCharacters: MAX_CHARACTERS,
  token: "",
  region: {
    text: "Global",
    code: "global"
  }
};
var LanguageTranslator = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.onEditorCallback = (editor) => __async(this, null, function* () {
      let res = "[translation error]";
      try {
        const selection = editor.getSelection();
        if (selection.length > this.settings.maxCharacters) {
          new import_obsidian3.Notice(`Exceeded ${this.settings.maxCharacters} max characters!`);
          return;
        }
        let textForTranslation = selection;
        let targetLang = this.settings.targetLanguage.code;
        let firstSemicolonIndex = textForTranslation.indexOf(":");
        if (firstSemicolonIndex != -1) {
          let potentialLangCode = textForTranslation.substring(0, firstSemicolonIndex);
          if (potentialLangCode) {
            let lc = langCodes_default.find((l) => l.code == potentialLangCode);
            if (lc) {
              targetLang = lc.code;
              textForTranslation = textForTranslation.substring(firstSemicolonIndex + 1);
            }
          }
        }
        res = yield this.translationService.translate(targetLang, textForTranslation);
      } catch (err) {
        console.log(err);
        new import_obsidian3.Notice(err.message);
      }
      editor.replaceSelection(res);
    });
  }
  onload() {
    return __async(this, null, function* () {
      this.translationService = new TranslationServiceImplementation(this);
      yield this.loadSettings();
      this.addCommand({
        id: "language-translator-editor-command",
        name: "Insert translation",
        editorCallback: this.onEditorCallback,
        hotkeys: [
          {
            modifiers: ["Ctrl", "Shift"],
            key: "R"
          }
        ]
      });
      this.addSettingTab(new LanguageTranslatorSettingsTab(this.app, this));
    });
  }
  loadSettings() {
    return __async(this, null, function* () {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
    });
  }
  saveSettings() {
    return __async(this, null, function* () {
      yield this.saveData(this.settings);
    });
  }
};
