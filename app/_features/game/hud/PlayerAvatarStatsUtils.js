export const getVpDisplay = ({ publicPoints, totalPoints, isMe }) => {
  const safePublic = publicPoints ?? 0;
  const safeTotal = totalPoints ?? 0;
  if (isMe && safeTotal > safePublic) {
    const hidden = safeTotal - safePublic;
    return `${safePublic} (+${hidden})`;
  }
  return `${safePublic}`;
};
