export const DEMO_WORKSPACE_ID = "ws_demo_uplytics";
export const DEMO_SLUG = "demo";
export const DEMO_OWNER_ID = "usr_demo_uplytics";
export const DEMO_SITE_MARKETING = process.env.DEMO_SITE_ID || "uplyticsweb1";
export const DEMO_SITE_STORE = "acmeshopdemo";
export const DEMO_SITE_IDS = [DEMO_SITE_MARKETING, DEMO_SITE_STORE];
export const DEMO_MEMBERS = [
  {
    id: DEMO_OWNER_ID,
    email: "jordan@uplytics.space",
    name: "Jordan Lee",
    role: "owner",
  },
  {
    id: "usr_demo_alex",
    email: "alex@uplytics.space",
    name: "Alex Chen",
    role: "admin",
  },
  {
    id: "usr_demo_sam",
    email: "sam@uplytics.space",
    name: "Sam Patel",
    role: "viewer",
  },
];
