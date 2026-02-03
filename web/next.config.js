const repo =
  process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.includes('/')
    ? process.env.GITHUB_REPOSITORY.split('/')[1]
    : '';

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ||
  (process.env.GITHUB_PAGES === 'true' && repo ? `/${repo}` : '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true }
};

module.exports = nextConfig;
