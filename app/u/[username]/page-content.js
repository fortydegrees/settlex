import { createElement as h } from "react";
import { notFound } from "next/navigation";
import { getPublicProfile } from "../../../lib/server/profiles/getPublicProfile.js";
import { PublicProfileView } from "./PublicProfileView.js";

export const createProfilePage = ({
  getPublicProfile: getPublicProfileImpl = getPublicProfile,
  notFoundImpl = notFound,
} = {}) =>
  async function PublicProfilePage({ params }) {
    const profile = await getPublicProfileImpl(params?.username);

    if (!profile) {
      return notFoundImpl();
    }

    return h(PublicProfileView, { profile });
  };

const PublicProfilePage = createProfilePage();

export default PublicProfilePage;
