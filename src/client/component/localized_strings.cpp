#include <std_include.hpp>
#include "localized_strings.hpp"
#include <game/game.hpp>
#include <loader/component_loader.hpp>
#include <utils/concurrency.hpp>
#include <utils/flags.hpp>
#include <utils/hook.hpp>
#include <utils/io.hpp>
#include <utils/string.hpp>
#include <rapidjson/document.h>

namespace localized_strings
{
namespace
{
    utils::hook::detour seh_string_ed_get_string_hook;
    using localized_map = std::unordered_map<std::string, std::string>;
    utils::concurrency::container<localized_map> localized_overrides;

    void load_french_overrides()
    {
        const auto path = game::get_appdata_path() / "data/localization/fr.json";
        std::string data;
        if (!utils::io::read_file(path.string(), &data))
        {
            utils::io::write_file(game::get_appdata_path() / "data/localization/fr.status", "missing");
            return;
        }

        rapidjson::Document document;
        document.Parse(data.data(), data.size());
        if (document.HasParseError() || !document.IsObject())
        {
            utils::io::write_file(game::get_appdata_path() / "data/localization/fr.status", "invalid-json");
            return;
        }

        const auto member_count = document.MemberCount();
        localized_overrides.access([&](localized_map& map)
        {
            for (auto it = document.MemberBegin(); it != document.MemberEnd(); ++it)
            {
                if (it->name.IsString() && it->value.IsString())
                {
                    const std::string key = it->name.GetString();
                    const std::string value = it->value.GetString();
                    map[key] = value;
                    map[utils::string::to_lower(key)] = value;
                }
            }
        });
        utils::io::write_file(game::get_appdata_path() / "data/localization/fr.status",
                              std::to_string(member_count));
    }

    const char* seh_string_ed_get_string(const char* reference)
    {
        const char* const localized = seh_string_ed_get_string_hook.invoke<const char*>(reference);
        return localized_overrides.access<const char*>([&](const localized_map& map)
        {
            const auto entry = map.find(reference);
            if (entry != map.end())
            {
                return utils::string::va("%s", entry->second.c_str());
            }

            // Also translate by the resolved English text. This covers stock UI
            // references whose identifiers are not exposed in BOIII's Lua files.
            if (localized != nullptr)
            {
                const auto text_entry = map.find(utils::string::to_lower(localized));
                if (text_entry != map.end())
                {
                    return utils::string::va("%s", text_entry->second.c_str());
                }
            }
            return localized;
        });
    }
}

void override(const std::string& key, const std::string& value)
{
    localized_overrides.access([&](localized_map& map) { map[key] = value; });
}

class component final : public client_component
{
public:
    void post_unpack() override
    {
        seh_string_ed_get_string_hook.create(game::select(0x14221CBC0, 0x1422796E0, 0x0), &seh_string_ed_get_string);
        if (utils::flags::has_flag("french"))
        {
            load_french_overrides();
        }
    }
};
}

REGISTER_COMPONENT(localized_strings::component)
