export const getWeaponComponents = (builds) => {
  // Handle empty or invalid builds
  if (!builds || !Array.isArray(builds) || builds.length === 0) {
    return {
      primaryWeapon: null,
      secondaryWeapon: null,
      primaryWeaponImageUrl: null,
      secondaryWeaponImageUrl: null
    };
  }

  // Use the first build
  const build = builds[0];
  
  // Handle different data structures
  const primary = build.primary || '';
  const secondary = build.secondary || '';
  
  // Get image URLs
  const getWeaponImageUrl = (weaponName) => {
    if (!weaponName) return null;
    const formattedName = weaponName.replace(/\s+/g, ' ').trim();
    return `${process.env.PUBLIC_URL}/weapons/${formattedName} Art.png`;
  };
  
  return {
    primaryWeapon: primary,
    secondaryWeapon: secondary,
    primaryWeaponImageUrl: getWeaponImageUrl(primary),
    secondaryWeaponImageUrl: getWeaponImageUrl(secondary)
  };
};