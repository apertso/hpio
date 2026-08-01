import React from 'react';

/** Декоративная банковская карта МИР для hero-секции лендинга */
export const LandingHeroCreditCard: React.FC = () => (
  <div
    className="landing-hero-credit-card absolute bottom-20 left-[4%] z-30 hidden lg:block xl:left-[5%]"
    aria-hidden="true"
  >
    <div className="landing-floating-element">
      <div className="landing-hero-credit-card-inner">
        <div className="landing-hero-credit-card-sheen" />

        <div className="relative flex h-full flex-col justify-between">
          <div className="landing-hero-credit-card-top-row flex items-start justify-between">
            <img
              className="landing-hero-credit-card-chip"
              src="/hero/chip.svg"
              alt=""
              draggable={false}
            />

            <svg
              className="landing-hero-credit-card-contactless"
              viewBox="0 0 20 22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.4 8.2a4.1 4.1 0 0 1 0 5.6"
                stroke="currentColor"
                strokeWidth="1.42"
                strokeLinecap="round"
              />
              <path
                d="M7 6.3a7.3 7.3 0 0 1 0 9.4"
                stroke="currentColor"
                strokeWidth="1.42"
                strokeLinecap="round"
              />
              <path
                d="M9.6 4.4a10.7 10.7 0 0 1 0 13.2"
                stroke="currentColor"
                strokeWidth="1.42"
                strokeLinecap="round"
              />
              <path
                d="M12.2 2.7a14 14 0 0 1 0 16.6"
                stroke="currentColor"
                strokeWidth="1.42"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="space-y-3">
            <div className="landing-hero-credit-card-number">
              {Array.from({ length: 3 }).map((_, groupIndex) => (
                <span
                  key={groupIndex}
                  className="landing-hero-credit-card-number-group"
                  aria-hidden="true"
                >
                  {Array.from({ length: 4 }).map((__, dotIndex) => (
                    <span
                      key={dotIndex}
                      className="landing-hero-credit-card-dot"
                    />
                  ))}
                </span>
              ))}
              <span className="landing-hero-credit-card-last4">4242</span>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-end gap-1.5">
                <p className="landing-hero-credit-card-valid-label">
                  VALID
                  <br />
                  THRU
                </p>
                <p className="landing-hero-credit-card-expiry">11/28</p>
              </div>

              <svg
                className="landing-hero-credit-card-mir"
                viewBox="0 0 400 120"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="m31 13h33c3 0 12-1 16 13 3 9 7 23 13 44h2c6-22 11-37 13-44 4-14 14-13 18-13h31v96h-32v-57h-2l-17 57h-24l-17-57h-3v57h-31m139-96h32v57h3l21-47c4-9 13-10 13-10h30v96h-32v-57h-2l-21 47c-4 9-14 10-14 10h-30m142-29v29h-30v-50h98c-4 12-18 21-34 21" />
                <path d="m382 53c4-18-8-40-34-40h-68c2 21 20 40 39 40" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
