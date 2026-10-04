#pragma once

#include <game/game.hpp>
#include <utils/io.hpp>
#include <utils/properties.hpp>

#include <rapidjson/document.h>

#include <string>
#include <unordered_map>

namespace launcher::localization {
inline void collect_source_message_keys(
    const rapidjson::Value &value, const std::string &prefix,
    std::unordered_map<std::string, std::string> &keys) {
  if (!value.IsObject())
    return;

  for (auto it = value.MemberBegin(); it != value.MemberEnd(); ++it) {
    if (!it->name.IsString())
      continue;

    const std::string key = prefix + "." + it->name.GetString();
    if (it->value.IsString()) {
      keys.insert_or_assign(it->value.GetString(), key);
    } else if (it->value.IsObject()) {
      collect_source_message_keys(it->value, key, keys);
    }
  }
}

inline const std::unordered_map<std::string, std::string> &
source_message_keys() {
  static const auto keys = [] {
    std::unordered_map<std::string, std::string> result;
    const auto path = game::get_appdata_path() / "data" / "launcher" /
                      "locales" / "en-US.json";
    std::string contents;
    if (!utils::io::read_file(path.string(), &contents) || contents.empty())
      return result;

    rapidjson::Document document;
    document.Parse<rapidjson::kParseValidateEncodingFlag>(contents.data(),
                                                           contents.size());
    if (document.HasParseError() || !document.IsObject() ||
        !document.HasMember("launcher") || !document["launcher"].IsObject()) {
      return result;
    }

    collect_source_message_keys(document["launcher"], "launcher", result);
    return result;
  }();

  return keys;
}

inline std::string message_key_for_english(const std::string &message) {
  const auto &keys = source_message_keys();
  const auto it = keys.find(message);
  return it == keys.end() ? std::string{} : it->second;
}

inline bool is_valid_locale_id(const std::string &locale) {
  const size_t separator = locale.find('-');
  if (separator < 2 || separator > 3 ||
      separator != locale.rfind('-') || locale.size() != separator + 3) {
    return false;
  }
  for (size_t i = 0; i < separator; ++i) {
    if (locale[i] < 'a' || locale[i] > 'z')
      return false;
  }
  for (size_t i = separator + 1; i < locale.size(); ++i) {
    if (locale[i] < 'A' || locale[i] > 'Z')
      return false;
  }
  return true;
}

inline std::string resolve_locale() {
  std::string requested;
  const auto preference = utils::properties::load("launcherLanguage");
  if (preference && !preference->empty() && *preference != "system") {
    requested = *preference;
  } else {
    wchar_t locale_name[LOCALE_NAME_MAX_LENGTH]{};
    if (GetUserDefaultLocaleName(locale_name, LOCALE_NAME_MAX_LENGTH) > 0) {
      const int length = WideCharToMultiByte(CP_UTF8, 0, locale_name, -1,
                                             nullptr, 0, nullptr, nullptr);
      if (length > 1) {
        requested.resize(static_cast<size_t>(length));
        WideCharToMultiByte(CP_UTF8, 0, locale_name, -1, requested.data(),
                            length, nullptr, nullptr);
        requested.pop_back();
      }
    }
  }

  const auto manifest_path = game::get_appdata_path() / "data" / "launcher" /
                             "locales" / "manifest.json";
  std::string contents;
  if (!utils::io::read_file(manifest_path.string(), &contents) ||
      contents.empty()) {
    return "en-US";
  }

  rapidjson::Document manifest;
  manifest.Parse<rapidjson::kParseValidateEncodingFlag>(contents.data(),
                                                        contents.size());
  if (manifest.HasParseError() || !manifest.IsObject() ||
      !manifest.HasMember("locales") || !manifest["locales"].IsObject()) {
    return "en-US";
  }

  const auto &locales = manifest["locales"];
  if (is_valid_locale_id(requested) && locales.HasMember(requested.c_str())) {
    return requested;
  }

  const auto separator = requested.find_first_of("-_");
  const auto language = requested.substr(0, separator);
  if (!language.empty()) {
    for (auto it = locales.MemberBegin(); it != locales.MemberEnd(); ++it) {
      if (!it->name.IsString())
        continue;
      const std::string locale = it->name.GetString();
      if (!is_valid_locale_id(locale))
        continue;
      if (locale.size() > language.size() &&
          locale.compare(0, language.size(), language) == 0 &&
          locale[language.size()] == '-') {
        return locale;
      }
    }
  }

  return locales.HasMember("en-US") ? "en-US" : std::string{};
}

inline std::string text_for_key(const std::string &locale,
                                const std::string &key) {
  if (!is_valid_locale_id(locale))
    return {};
  const auto locale_path = game::get_appdata_path() / "data" / "launcher" /
                           "locales" / (locale + ".json");
  std::string contents;
  if (!utils::io::read_file(locale_path.string(), &contents) ||
      contents.empty() || contents.size() > 1024 * 1024) {
    return {};
  }

  rapidjson::Document catalog;
  catalog.Parse<rapidjson::kParseValidateEncodingFlag>(contents.data(),
                                                        contents.size());
  if (catalog.HasParseError() || !catalog.IsObject())
    return {};

  const rapidjson::Value *value = &catalog;
  size_t start = 0;
  while (start < key.size()) {
    const size_t end = key.find('.', start);
    const size_t length = (end == std::string::npos ? key.size() : end) - start;
    if (!value->IsObject())
      return {};
    const auto member = value->FindMember(
        rapidjson::StringRef(key.data() + start,
                             static_cast<rapidjson::SizeType>(length)));
    if (member == value->MemberEnd())
      return {};
    value = &member->value;
    if (end == std::string::npos)
      break;
    start = end + 1;
  }

  return value->IsString() ? std::string(value->GetString()) : std::string{};
}

inline std::string localized_message(const std::string &locale,
                                     const std::string &message) {
  const std::string key = message_key_for_english(message);
  if (key.empty())
    return message;
  const std::string translated = text_for_key(locale, key);
  return translated.empty() ? message : translated;
}

inline std::wstring to_wide(const std::string &utf8) {
  if (utf8.empty())
    return {};
  const int length = MultiByteToWideChar(CP_UTF8, 0, utf8.data(),
                                         static_cast<int>(utf8.size()),
                                         nullptr, 0);
  if (length <= 0)
    return std::wstring(utf8.begin(), utf8.end());
  std::wstring result(static_cast<size_t>(length), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, utf8.data(),
                      static_cast<int>(utf8.size()), result.data(), length);
  return result;
}
} // namespace launcher::localization
