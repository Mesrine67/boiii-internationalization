-- BO3 builds a few frontend labels at runtime instead of resolving them
-- through StringEd (notably the party player count and server-list status).
-- Translate these final strings here so they follow the same French pack.
local boiiiFrenchUiStrings = {
  ["back"] = "Retour",
  ["press enter to start"] = "Appuyez sur ENTRÉE pour commencer",
  ["look"] = "REGARD",
  ["move"] = "DÉPLACEMENT",
  ["combat"] = "COMBAT",
  ["interact"] = "INTERACTION",
  ["gamepad"] = "MANETTE",
  ["keyboard shortcuts"] = "Raccourcis clavier",
  ["use"] = "Utiliser",
  ["special action 1"] = "Action spéciale 1",
  ["special action 2"] = "Action spéciale 2",
  ["special action 3"] = "Action spéciale 3",
  ["special action 4"] = "Action spéciale 4",
  ["screenshot"] = "Capture d’écran",
  ["scoreboard"] = "Tableau des scores",
  ["scoreboard toggle"] = "Afficher/masquer le tableau des scores",
  ["voice chat"] = "Discussion vocale",
  ["team chat"] = "Discussion d’équipe",
  ["party chat"] = "Discussion de groupe",
  ["attack"] = "Attaquer",
  ["ads"] = "Viser",
  ["aim down sights"] = "Viser avec le viseur",
  ["toggle ads"] = "Activer/désactiver la visée",
  ["toggle aim down sights"] = "Activer/désactiver la visée",
  ["melee attack"] = "Attaque au corps à corps",
  ["switch weapon"] = "Changer d’arme",
  ["previous weapon"] = "Arme précédente",
  ["next weapon"] = "Arme suivante",
  ["specialist ability/weapon"] = "Capacité/arme du spécialiste",
  ["reload weapon"] = "Recharger l’arme",
  ["sprint"] = "Sprinter",
  ["sprint/hold breath"] = "Sprinter / retenir sa respiration",
  ["steady sniper rifle"] = "Stabiliser le fusil de précision",
  ["throw primary"] = "Lancer l’équipement principal",
  ["throw secondary"] = "Lancer l’équipement secondaire",
  ["look inversion"] = "Inversion de la visée verticale",
  ["toggle inversion of your view pitch."] = "Inverser la visée verticale.",
  ["reset your view pitch"] = "Réinitialiser l’angle vertical de la vue",
  ["gamepad vibration"] = "Vibrations de la manette",
  ["target assist"] = "Assistance à la visée",
  ["stick layout"] = "Configuration des sticks",
  ["default"] = "Par défaut",
  ["button layout"] = "Configuration des boutons",
  ["look sensitivity horizontal"] = "Sensibilité horizontale de la vue",
  ["look sensitivity vertical"] = "Sensibilité verticale de la vue",
  ["split screen"] = "Écran partagé",
  ["player 2 input device"] = "Périphérique d’entrée du joueur 2",
  ["none"] = "Aucun",
  ["right mouse"] = "CLIC DROIT",
  ["wheel down"] = "MOLETTE VERS LE BAS",
  ["wheel up"] = "MOLETTE VERS LE HAUT",
  ["middle mouse"] = "CLIC MOYEN",
  ["g or middle mouse"] = "G OU CLIC MOYEN",
  ["forward"] = "Avancer",
  ["backpedal"] = "Reculer",
  ["move left"] = "Aller à gauche",
  ["move right"] = "Aller à droite",
  ["stand/jump"] = "Se relever / Sauter",
  ["go to crouch"] = "S’accroupir",
  ["go to prone"] = "S’allonger",
  ["toggle crouch"] = "Activer/désactiver l’accroupissement",
  ["toggle prone"] = "Activer/désactiver la position allongée",
  ["crouch"] = "S’accroupir",
  ["prone"] = "S’allonger",
  ["slide"] = "Glisser",
  ["change stance"] = "Changer de posture",
  ["strafe"] = "Pas latéral",
  ["reset to default"] = "Rétablir les valeurs par défaut",
  ["unbound"] = "NON ASSIGNÉ",
  ["space"] = "ESPACE",
  ["caps lock or left mouse"] = "VERR. MAJ. OU CLIC GAUCHE",
  ["left mouse"] = "CLIC GAUCHE",
  ["shift"] = "MAJ",
  ["alt"] = "ALT",
  ["ctrl"] = "CTRL",
  ["dismiss menu"] = "Fermer le menu",
  ["load"] = "Charger",
  ["refresh"] = "Actualiser",
  ["refresh all"] = "Tout actualiser",
  ["add to favorites"] = "Ajouter aux favoris",
  ["join server"] = "Rejoindre le serveur",
  ["filters"] = "Filtres",
  ["server name"] = "Nom du serveur",
  ["map"] = "Carte",
  ["game mode"] = "Mode de jeu",
  ["no servers found"] = "Aucun serveur trouvé",
  ["recent"] = "Récents",
  ["friends"] = "Amis",
  ["favorites"] = "Favoris",
  ["team deathmatch"] = "MATCH À MORT PAR ÉQUIPE",
  ["free-for-all"] = "MÊLÉE GÉNÉRALE",
  ["gun game"] = "JEU D’ARMES",
  ["domination"] = "DOMINATION",
  ["search & destroy"] = "RECHERCHE ET DESTRUCTION",
  ["kill confirmed"] = "ÉLIMINATION CONFIRMÉE",
  ["classic"] = "CLASSIQUE",
  ["gunsmith"] = "ARMURERIE",
  ["craft custom variants of your guns for use in campaign and multiplayer"] = "Créez des variantes personnalisées de vos armes pour la campagne et le multijoueur.",
  ["emblems"] = "EMBLÈMES",
  ["calling cards"] = "CARTES DE VISITE",
  ["paintshop"] = "ATELIER DE PERSONNALISATION",
  ["screenshots"] = "CAPTURES D’ÉCRAN",
  ["clan tag"] = "TAG DE CLAN",
  ["complete campaign challenges"] = "Terminez les défis de la campagne",
  ["complete multiplayer challenges"] = "Terminez les défis du multijoueur",
  ["complete zombies challenges"] = "Terminez les défis du mode Zombies",
  ["nearest to completion"] = "Défi le plus proche de l’achèvement",
  ["available at gunnery sergeant (level 16)"] = "Disponible au grade de sergent-chef (niveau 16)",
  ["neophyte operative"] = "Opérateur novice",
  ["recruit"] = "Recrue",
  ["initiate"] = "Initié",
  ["combat record"] = "Dossier de combat",
  ["leaderboards"] = "Classements",
  ["combat record, leaderboards, prestige"] = "Dossier de combat, classements et prestige",
  ["popular"] = "Populaire",
  ["trending"] = "Tendances",
  ["my showcase"] = "Ma vitrine",
  ["upload or view your published content"] = "Envoyez ou consultez votre contenu publié",
}

local function boiiiTranslateFrontendText(text)
  if type(text) ~= "string" then return text end
  -- LUI strings can include color codes or padding that is invisible on
  -- screen. Normalize only for matching; keep the original untouched if no
  -- French entry applies.
  local normalizedText = string.lower(text):gsub("%^%d", "")
  normalizedText = normalizedText:gsub("^%s+", ""):gsub("%s+$", "")
  local translated = boiiiFrenchUiStrings[normalizedText]
  if translated then return translated end
  local players, maxPlayers = normalizedText:match("^(%d+)%s+players%s+%((%d+)%s+max%)$")
  if players then
    local count = tonumber(players) or 0
    return string.format("%d joueur%s (%s max.)", count, count == 1 and "" or "s", maxPlayers)
  end
  local retrievingCount = normalizedText:match("^retrieving servers:%s*(%d+)$")
  if retrievingCount then return "Recherche des serveurs : " .. retrievingCount end
  local level = normalizedText:match("^level%s+(%d+)$")
  if level then return "NIVEAU " .. level end
  local requiredLevel = normalizedText:match("^requires level%s+(%d+)$")
  if requiredLevel then return "Niveau requis : " .. requiredLevel end
  return text
end

-- Retain the engine's formatting behavior; only translate the returned text.
if type(Engine.Localize) == "function" and not Engine._boiiiFrenchLocalizeWrapped then
  pcall(function()
    local originalLocalize = Engine.Localize
    Engine.Localize = function(...)
      return boiiiTranslateFrontendText(originalLocalize(...))
    end
    Engine._boiiiFrenchLocalizeWrapped = true
  end)
end

-- Some stock UI widgets bypass Engine.Localize and send English directly to
-- setText. Patch the unique methods once and leave non-string values untouched.
if LUI and not LUI._boiiiFrenchTextPatched then
  local ok, patchedAnyTextMethod = pcall(function()
    local classes = {}
    if type(LUI.UIElement) == "table" then
      classes[#classes + 1] = LUI.UIElement
    end
    if type(LUI.UIText) == "table" then
      classes[#classes + 1] = LUI.UIText
    end
    local patched = {}
    local patchedAny = false
    for _, class in ipairs(classes) do
      local originalSetText = class.setText
      if type(originalSetText) == "function" and not patched[originalSetText] then
        local wrapped = function(self, text, ...)
          return originalSetText(self, boiiiTranslateFrontendText(text), ...)
        end
        local methodOk = pcall(function()
          class.setText = wrapped
        end)
        if methodOk then
          patched[originalSetText] = true
          patchedAny = true
        end
      end
    end
    return patchedAny
  end)
  if ok and patchedAnyTextMethod then
    LUI._boiiiFrenchTextPatched = true
  end
end

-- Install the small text translator on every LUI startup. The menu-specific
-- button changes below still run only while the frontend map is active.
if Engine.GetCurrentMap() ~= "core_frontend" then return end
if not CoD.LobbyButtons then return end
if type(Engine.IsUsingMods) == "function" and Engine.IsUsingMods() and (type(Engine.UsingModsUgcName) ~= "function" or Engine.UsingModsUgcName() ~= "usermaps") then return end
local enableLobbyMapVote = true -- toggle map vote in public lobby
local enableLargeServerBrowserButton = true -- toggle large server browser button
local utils = require("utils")
require("datasources_start_menu_tabs")
require("datasources_change_map_categories")
require("datasources_gamesettingsflyout_buttons")
CoD.LobbyButtons.PLAY_LOCAL.stringRef = "^1" .. Engine.Localize("MENU_PLAY_LOCAL_CAPS")
CoD.LobbyButtons.PLAY_ONLINE.stringRef = "^2" .. Engine.Localize("XBOXLIVE_PLAY_ONLINE_CAPS")
CoD.LobbyButtons.MP_PUBLIC_MATCH = {
  stringRef = "MENU_PLAY_CAPS",
  action = NavigateToLobby_SelectionList,
  param = "MPLobbyOnline",
  customId = "btnPublicMatch",
}
CoD.LobbyButtons.MP_FIND_MATCH = {
  stringRef = "MPUI_BASICTRAINING_CAPS",
  action = OpenFindMatch,
  customId = "btnFindMatch",
}
CoD.LobbyButtons.STATS = {
  stringRef = "STATS",
  action = function(self, element, controller, param, menu)
    SetPerControllerTableProperty(controller, "disableGameSettingsOptions", true)
    OpenPopup(menu, "BoiiiStatsMenu", controller)
  end,
  customId = "btnMPStats",
}
CoD.LobbyButtons.QUICK_SETTINGS = {
  stringRef = "QUICK SETTINGS",
  action = function(self, element, controller, param, menu)
    SetPerControllerTableProperty(controller, "disableGameSettingsOptions", true)
    OpenPopup(menu, "BoiiiQuickSettingsMenu", controller)
  end,
  customId = "btnQuickSettings",
}
CoD.LobbyButtons.MP_START_GAME = {
  stringRef = "MENU_START_GAME_CAPS",
  action = function(self, element, controller, param, menu)
    Engine.SetDvar("party_minplayers", 1)
    Engine.Exec(nil, "launchgame")
  end,
  customId = "btnStartGame",
}
CoD.LobbyButtons.SETTING_UP_BOTS = {
  stringRef = "MENU_SETUP_BOTS_CAPS",
  action = function(self, element, controller, param, menu)
    SetPerControllerTableProperty(controller, "disableGameSettingsOptions", true)
    OpenPopup(menu, "GameSettings_Bots", controller)
  end,
  customId = "btnSettingUpBots",
}
CoD.LobbyButtons.GameSettingsFlyoutArenas = {
  stringRef = "MPUI_SETUP_GAME_CAPS",
  action = function(self, element, controller, param, menu)
    SetPerControllerTableProperty(controller, "disableGameSettingsOptions", true)
    OpenPopup(menu, "GameSettingsFlyoutMP", controller)
  end,
  customId = "btnGameSettingsFlyoutMP",
}

CoD.LobbyButtons.GameSettingsFlyoutMP = {
  stringRef = "MPUI_SETUP_GAME_CAPS",
  action = function(self, element, controller, param, menu)
    SetPerControllerTableProperty(controller, "disableGameSettingsOptions", true)
    OpenPopup(menu, "GameSettingsFlyoutMPCustom", controller)
  end,
  customId = "btnGameSettingsFlyoutMPCustom",
}

CoD.LobbyButtons.SERVER_BROWSER = {
  stringRef = "MENU_SERVER_BROWSER_CAPS",
  action = function(self, element, controller, param, menu)
    SetPerControllerTableProperty(controller, "disableGameSettingsOptions", true)
    OpenPopup(menu, "LobbyServerBrowserOnline", controller)
  end,
  customId = "btnDedicated",
}

local shouldShowMapVote = enableLobbyMapVote
local lobbyMapVote = function(lobbyMapVoteIsEnabled)
  if lobbyMapVoteIsEnabled == true then
    Engine.Exec(nil, "LobbyStopDemo")
  end
end

local addCustomButtons = function(controller, menuId, buttonTable, isLeader)
  if menuId == LobbyData.UITargets.UI_MPLOBBYMAIN.id then
    utils.RemoveSpaces(buttonTable)
    local theaterIndex = utils.GetButtonIndex(buttonTable, CoD.LobbyButtons.THEATER_MP)
    if theaterIndex ~= nil then
      utils.AddSpacer(buttonTable, theaterIndex - 1)
    end
  end
  if menuId == LobbyData.UITargets.UI_MPLOBBYMAIN.id or menuId == LobbyData.UITargets.UI_MPLOBBYONLINE.id or menuId == LobbyData.UITargets.UI_ZMLOBBYONLINE.id or menuId == LobbyData.UITargets.UI_ZMLOBBYLANGAME.id or (LobbyData.UITargets.UI_CPLOBBYONLINE and menuId == LobbyData.UITargets.UI_CPLOBBYONLINE.id) or (LobbyData.UITargets.UI_CPLOBBYLANGAME and menuId == LobbyData.UITargets.UI_CPLOBBYLANGAME.id) then
    utils.AddSmallButton(controller, buttonTable, CoD.LobbyButtons.STATS)
    utils.AddSmallButton(controller, buttonTable, CoD.LobbyButtons.QUICK_SETTINGS)
  end
  if menuId == LobbyData.UITargets.UI_ZMLOBBYLANGAME.id then
    for _, button in ipairs({
      CoD.LobbyButtons.ZM_BUBBLEGUM_BUFFS,
      CoD.LobbyButtons.ZM_MEGACHEW_FACTORY,
      CoD.LobbyButtons.ZM_GOBBLEGUM_RECIPES,
    }) do
      if utils.GetButtonIndex(buttonTable, button) == nil then
        utils.AddSmallButton(controller, buttonTable, button)
      end
    end
  end
  if menuId == LobbyData.UITargets.UI_MPLOBBYONLINE.id or menuId == LobbyData.UITargets.UI_ZMLOBBYONLINE.id or menuId == LobbyData.UITargets.UI_MPLOBBYMAIN.id or menuId == LobbyData.UITargets.UI_MPLOBBYLANGAME.id then
    Engine.Mods_Lists_UpdateUsermaps()
  end
  if menuId == LobbyData.UITargets.UI_MPLOBBYONLINE.id then
    shouldShowMapVote = enableLobbyMapVote
    if enableLargeServerBrowserButton then
      utils.AddLargeButton(controller, buttonTable, CoD.LobbyButtons.SERVER_BROWSER, 1)
    end
  elseif menuId == LobbyData.UITargets.UI_MPLOBBYONLINEPUBLICGAME.id then
    utils.RemoveButton(buttonTable, CoD.LobbyButtons.MP_PUBLIC_LOBBY_LEADERBOARD)
    utils.AddLargeButton(controller, buttonTable, CoD.LobbyButtons.MP_START_GAME, 1)
    utils.AddSmallButton(controller, buttonTable, CoD.LobbyButtons.GameSettingsFlyoutMP, 2)
    utils.AddSpacer(buttonTable, utils.GetButtonIndex(buttonTable, CoD.LobbyButtons.GameSettingsFlyoutMP))
    lobbyMapVote(shouldShowMapVote)
    shouldShowMapVote = false
  elseif menuId == LobbyData.UITargets.UI_MPLOBBYONLINEARENAGAME.id then
    utils.AddLargeButton(controller, buttonTable, CoD.LobbyButtons.MP_START_GAME, 1)
    utils.AddSmallButton(controller, buttonTable, CoD.LobbyButtons.GameSettingsFlyoutArenas, 2)
    utils.AddSpacer(buttonTable, utils.GetButtonIndex(buttonTable, CoD.LobbyButtons.GameSettingsFlyoutArenas))
  end
  if menuId == LobbyData.UITargets.UI_ZMLOBBYONLINE.id then
    utils.RemoveButton(buttonTable, CoD.LobbyButtons.THEATER_ZM)
    utils.AddLargeButton(controller, buttonTable, CoD.LobbyButtons.THEATER_ZM)
    utils.RemoveSpaces(buttonTable)
    utils.AddSpacer(buttonTable, utils.GetButtonIndex(buttonTable, CoD.LobbyButtons.SERVER_BROWSER))
    local bgbIndex = utils.GetButtonIndex(buttonTable, CoD.LobbyButtons.ZM_BUBBLEGUM_BUFFS)
    if bgbIndex ~= nil then
      utils.AddSpacer(buttonTable, bgbIndex - 1)
    end
    utils.AddSpacer(buttonTable, utils.GetButtonIndex(buttonTable, CoD.LobbyButtons.STATS))
  end
end

local oldAddButtonsForTarget = CoD.LobbyMenus.AddButtonsForTarget
CoD.LobbyMenus.AddButtonsForTarget = function(controller, id)
  local model = nil
  if Engine.IsLobbyActive(Enum.LobbyType.LOBBY_TYPE_GAME) then
    model = Engine.GetModel(DataSources.LobbyRoot.getModel(controller), "gameClient.isHost")
  else
    model = Engine.GetModel(DataSources.LobbyRoot.getModel(controller), "privateClient.isHost")
  end
  local isLeader = nil
  if model ~= nil then
    isLeader = Engine.GetModelValue(model)
  else
    isLeader = 1
  end
  local result = oldAddButtonsForTarget(controller, id)
  addCustomButtons(controller, id, result, isLeader)
  return result
end
