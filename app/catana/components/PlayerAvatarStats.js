import Image from "./NextImage";
import longestRoadIcon from "../../../public/svgs/icon_longest_road.svg";
import largestArmyIcon from "../../../public/svgs/icon_largest_army.svg";
import { StatusBubble } from "./StatusBubble";
import {
  getLongestRoadLength,
  getVictoryPoints,
  getPublicVictoryPoints,
} from "@settlex/game-core";
import { getVpDisplay } from "./PlayerAvatarStatsUtils";
import "./PlayerAvatarStats.css";

// Explicit gradient classes so Tailwind JIT includes them.
const AVATAR_GRADIENTS = {
  red: "from-red-500 to-red-800",
  blue: "from-blue-500 to-blue-800",
  green: "from-green-500 to-green-800",
  orange: "from-orange-500 to-orange-800",
  purple: "from-purple-500 to-purple-800",
  pink: "from-pink-500 to-pink-800",
  cyan: "from-cyan-500 to-cyan-800",
  amber: "from-amber-500 to-amber-800",
};

export const PlayerAvatarStats = ({ player, core, coreTopology, isMe, isActive, statusType }) => {
  if (!player) return null;

  // Prefer the player's chosen color; fall back to seat-index color.
  const colorKey = player.chosenColor || player.color;
  const avatarColor = AVATAR_GRADIENTS[colorKey] || AVATAR_GRADIENTS[player.color] || "from-slate-500 to-slate-800";
  const currentRoadLength = core && coreTopology
    ? getLongestRoadLength(core, coreTopology, player.id)
    : 0;
  const currentArmySize = player.knightsPlayed || 0;
  const hasLongestRoad = core?.awards?.longestRoadOwnerId === player.id;
  const hasLargestArmy = core?.awards?.largestArmyOwnerId === player.id;

  const totalPoints = core ? getVictoryPoints(core, player.id) : 0;
  const publicPoints = core ? getPublicVictoryPoints(core, player.id) : 0;
  const vpDisplay = getVpDisplay({ publicPoints, totalPoints, isMe });

  return (
    <>
      <span className="flex relative">
        {isActive && (
          <span className="absolute -top-5 left-1/2 -translate-x-1/2">
            <span className="turn-chevron" />
          </span>
        )}
        <div
          className={`h-20 w-20 rounded-md bg-gradient-to-t ring-4 ring-white flex justify-center items-center text-6xl ${avatarColor} ${isActive ? "avatar-active-glow" : ""}`}
        >
          {player.emoji || "🤠"}
        </div>
        <span className="absolute right-0 top-0 h-8 -translate-y-1/2 translate-x-1/2 transform rounded-full bg-blue-50 ring-2 ring-white text-xl font-semibold flex items-center justify-center min-w-[2rem] px-1">
          {vpDisplay}
        </span>
        {/* Only show status bubble for opponents, not for self */}
        {!isMe && <StatusBubble statusType={statusType} isVisible={isActive} />}
      </span>
      <span className="bg-blue-200 bg-opacity-50 rounded-r-md flex h-20 px-2 gap-x-2 items-center ring-2 ring-slate-300">
        <div className="flex flex-col gap-y-1">
          <div className="flex items-center">
            <div className="w-8 h-8 flex items-center justify-center">
              <Image
                src={longestRoadIcon}
                alt="Longest road"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span
              className={`w-6 text-center text-xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] ${
                hasLongestRoad ? "text-yellow-400 font-bold" : "text-white"
              }`}
            >
              {currentRoadLength}
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 flex items-center justify-center">
              <Image
                src={largestArmyIcon}
                alt="Largest army"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span
              className={`w-6 text-center text-xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] ${
                hasLargestArmy ? "text-yellow-400 font-bold" : "text-white"
              }`}
            >
              {currentArmySize}
            </span>
          </div>
        </div>
      </span>
    </>
  );
};
