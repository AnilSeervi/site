'use client';

import { Dock } from 'components/BottonDock/Dock';
import { DockCard } from 'components/BottonDock/DockCard';
import { DockDivider } from 'components/BottonDock/DockDivider';
import Changetheme from 'components/Changetheme';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAVITEMS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          opacity="0.25"
          d="M20 18.8V6.63998L13.6514 2.81501L13.6514 2.815C13.0511 2.45333 12.751 2.2725 12.4304 2.20186C12.1469 2.13938 11.8531 2.13938 11.5696 2.20186C11.249 2.2725 10.9489 2.45334 10.3486 2.81501L4 6.64001V18.8C4 19.9201 4 20.4802 4.21799 20.908C4.40973 21.2843 4.71569 21.5903 5.09202 21.782C5.51984 22 6.0799 22 7.2 22H16.8C17.9201 22 18.4802 22 18.908 21.782C19.2843 21.5903 19.5903 21.2843 19.782 20.908C20 20.4802 20 19.9201 20 18.8Z"
          fill="currentColor"
        ></path>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.14251 9.5145C1.42665 9.98808 2.04091 10.1416 2.51449 9.85749L12 4.16619L21.4855 9.85749C21.9591 10.1416 22.5733 9.98808 22.8575 9.5145C23.1416 9.04092 22.9881 8.42666 22.5145 8.14251L13.029 2.45121C12.3956 2.07119 11.6044 2.07119 10.971 2.45121L1.4855 8.14251C1.01192 8.42666 0.858357 9.04092 1.14251 9.5145Z"
          fill="currentColor"
        ></path>
        <path
          d="M9 16C9 14.3431 10.3431 13 12 13C13.6569 13 15 14.3431 15 16V22H9V16Z"
          fill="currentColor"
        ></path>
      </svg>
    ),
    label: 'Home',
    path: '/'
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
      >
        <g fill="none" fillRule="evenodd">
          <path d="M24 0v24H0V0h24ZM12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036c-.01-.003-.019 0-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01l-.184-.092Z"></path>
          <path
            fill="currentColor"
            d="M16.239 4.79c-.595.127-1.456.478-2.55 1.085c-2.034 1.127-4.763 3.294-7.949 6.798a1 1 0 1 1-1.48-1.346c3.276-3.603 6.172-5.934 8.458-7.202c1.16-.643 2.225-1.104 3.107-1.29c.778-.166 1.942-.211 2.541.768c.271.443.313.948.265 1.404c-.048.461-.197.965-.417 1.499c-.44 1.069-1.232 2.42-2.397 4.07c-1.362 1.93-2.103 3.241-2.437 4.09a3.86 3.86 0 0 0-.163.5c.105-.022.23-.056.378-.105c.555-.185 1.235-.525 1.89-.918c.64-.384 1.22-.662 1.722-.74c.263-.04.609-.043.946.126c.369.185.576.497.673.793c.143.439.078.913-.024 1.352c-.165.713-.443 1.395-.621 2.104c.109-.046.232-.103.372-.172a1 1 0 0 1 .894 1.788c-.65.325-1.265.552-1.81.55a1.567 1.567 0 0 1-.934-.29a1.468 1.468 0 0 1-.54-.798c-.136-.481-.049-1.007.033-1.372c.13-.592.337-1.162.514-1.74c-.804.457-1.6.92-2.483 1.215a4.314 4.314 0 0 1-1.16.237c-.374.015-.873-.04-1.29-.38c-.452-.366-.603-.892-.602-1.376c0-.463.134-.971.344-1.506c.423-1.076 1.276-2.544 2.664-4.51c1.13-1.6 1.824-2.811 2.181-3.68c.13-.316.264-.66.283-1.006c-.083 0-.213.011-.408.053Z"
          ></path>
        </g>
      </svg>
    ),
    label: 'Guestbook',
    path: '/guestbook'
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
      >
        <g fill="currentColor">
          <path d="M12 2c1.845 0 3.33 0 4.54.088L13.1 7.25H8.402l3.5-5.25H12ZM3.465 3.464c1.252-1.252 3.157-1.433 6.631-1.46L6.599 7.25H2.104c.148-1.764.503-2.928 1.36-3.786ZM21.896 7.25c-.147-1.764-.503-2.928-1.36-3.786c-.598-.597-1.343-.95-2.337-1.16L14.902 7.25h6.994Z"></path>
          <path
            fillRule="evenodd"
            d="M17.5 22c-2.121 0-3.182 0-3.841-.659C13 20.682 13 19.621 13 17.5c0-2.121 0-3.182.659-3.841C14.318 13 15.379 13 17.5 13c2.121 0 3.182 0 3.841.659c.659.659.659 1.72.659 3.841c0 2.121 0 3.182-.659 3.841c-.659.659-1.72.659-3.841.659Zm2.212-6.712a.983.983 0 0 1 0 1.39l-.058.058a.238.238 0 0 1-.211.067a1.594 1.594 0 0 1-.81-.436a1.594 1.594 0 0 1-.436-.81a.238.238 0 0 1 .067-.211l.058-.058a.983.983 0 0 1 1.39 0ZM17.35 19.04a3.419 3.419 0 0 1-.296.279a1.634 1.634 0 0 1-.303.187a3.404 3.404 0 0 1-.381.14l-1.021.34a.265.265 0 0 1-.335-.335l.34-1.02c.064-.194.097-.291.14-.382c.051-.108.114-.21.187-.303c.062-.08.134-.152.279-.296l1.799-1.799c.043-.043.118-.023.138.035a1.984 1.984 0 0 0 1.217 1.217c.058.02.078.095.035.138l-1.799 1.8Z"
            clipRule="evenodd"
          ></path>
          <path
            d="M2.026 8.75C2 9.689 2 10.763 2 12c0 4.714 0 7.071 1.464 8.535C4.93 22 7.286 22 12 22c1.358 0 2.52 0 3.522-.035c-.884-.058-1.452-.213-1.863-.624C13 20.682 13 19.621 13 17.5c0-2.121 0-3.182.659-3.841C14.318 13 15.379 13 17.5 13c2.121 0 3.182 0 3.841.659c.411.411.566.979.624 1.863C22 14.52 22 13.358 22 12c0-1.237 0-2.311-.026-3.25H2.026Z"
            opacity=".25"
          ></path>
        </g>
      </svg>
    ),
    label: 'Blog',
    path: '/blog'
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
      >
        <g fill="currentColor">
          <path
            d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2c4.714 0 7.071 0 8.535 1.464C22 4.93 22 7.286 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z"
            opacity=".25"
          ></path>
          <path d="M6.424 9.52a.75.75 0 0 1 1.056-.096l.277.23c.605.504 1.12.933 1.476 1.328c.379.42.674.901.674 1.518s-.295 1.099-.674 1.518c-.356.395-.871.824-1.476 1.328l-.277.23a.75.75 0 1 1-.96-1.152l.234-.195c.659-.55 1.09-.91 1.366-1.216c.262-.29.287-.427.287-.513c0-.086-.025-.222-.287-.513c-.277-.306-.707-.667-1.366-1.216l-.234-.195a.75.75 0 0 1-.096-1.056ZM17.75 15a.75.75 0 0 1-.75.75h-5a.75.75 0 0 1 0-1.5h5a.75.75 0 0 1 .75.75Z"></path>
        </g>
      </svg>
    ),
    label: 'Snippets',
    path: '/snippets'
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
      >
        <g fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3.464 3.464C2 4.93 2 7.286 2 12c0 4.714 0 7.071 1.464 8.535C4.93 22 7.286 22 12 22c4.714 0 7.071 0 8.535-1.465C22 19.072 22 16.714 22 12s0-7.071-1.465-8.536C19.072 2 16.714 2 12 2S4.929 2 3.464 3.464Z"
            clipRule="evenodd"
            opacity=".25"
          ></path>
          <path d="M8.504 13.177a1.55 1.55 0 0 0-2.183-.073l-.81.753a.75.75 0 0 1-1.021-1.1l.81-.752a3.05 3.05 0 0 1 4.296.143l2.647 2.81a.795.795 0 0 0 1.054.092a3.067 3.067 0 0 1 3.953.241l2.268 2.167a.75.75 0 0 1-1.036 1.084l-2.268-2.166a1.567 1.567 0 0 0-2.02-.123a2.295 2.295 0 0 1-3.043-.266l-2.647-2.81ZM18 8a2 2 0 1 1-4 0a2 2 0 0 1 4 0Z"></path>
        </g>
      </svg>
    ),
    label: 'Anime',
    path: '/anime'
  },
  null,
  {
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path fill="none" d="M0 0h24v24H0z"></path>
        <path d="M12 2C6.475 2 2 6.475 2 12a9.994 9.994 0 0 0 6.838 9.488c.5.087.687-.213.687-.476 0-.237-.013-1.024-.013-1.862-2.512.463-3.162-.612-3.362-1.175-.113-.288-.6-1.175-1.025-1.413-.35-.187-.85-.65-.013-.662.788-.013 1.35.725 1.538 1.025.9 1.512 2.338 1.087 2.912.825.088-.65.35-1.087.638-1.337-2.225-.25-4.55-1.113-4.55-4.938 0-1.088.387-1.987 1.025-2.688-.1-.25-.45-1.275.1-2.65 0 0 .837-.262 2.75 1.026a9.28 9.28 0 0 1 2.5-.338c.85 0 1.7.112 2.5.337 1.912-1.3 2.75-1.024 2.75-1.024.55 1.375.2 2.4.1 2.65.637.7 1.025 1.587 1.025 2.687 0 3.838-2.337 4.688-4.562 4.938.362.312.675.912.675 1.85 0 1.337-.013 2.412-.013 2.75 0 .262.188.574.688.474A10.016 10.016 0 0 0 22 12c0-5.525-4.475-10-10-10z"></path>
      </svg>
    ),
    label: 'GitHub',
    route: 'https://github.com/AnilSeervi'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          opacity="0.25"
          d="M20.9999 7.5C21.4999 15 15.9999 21 8.99995 21C6.58804 21 4.17613 20.6768 2.28388 19.7706C1.85051 19.5631 2.0199 18.985 2.49936 18.9532C4.82944 18.7987 6.75765 18.2423 7.99995 17C11.0001 14 11.5 13 12.2646 9.02396C12.0933 8.54804 11.9999 8.03492 11.9999 7.5C11.9999 5.01472 14.0147 3 16.4999 3C18.0181 3 19.3607 3.75182 20.1757 4.90346L21.8929 4.65815C22.3207 4.59703 22.6194 5.07087 22.3796 5.43047L20.9999 7.5Z"
          fill="currentColor"
        ></path>
        <path
          d="M7.99998 16.9999C2.58358 15.1944 1.64928 8.49939 2.62226 5.00708C2.73651 4.59701 3.26964 4.59488 3.48453 4.96234C5.14601 7.80359 8.30518 9.38991 12.2646 9.02385C18.5 9.02385 17 19.9999 7.99998 16.9999Z"
          fill="currentColor"
        ></path>
      </svg>
    ),
    label: 'Twitter',
    route: 'https://twitter.com/linASeervi'
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="M6.94 5a2 2 0 1 1-4-.002a2 2 0 0 1 4 .002ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68Z"
        ></path>
      </svg>
    ),
    label: 'LinkedIn',
    route: 'https://www.linkedin.com/in/anilseervi/'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          opacity="0.25"
          d="M1 6C1 4.34315 2.34315 3 4 3H20C21.6569 3 23 4.34315 23 6V18C23 19.6569 21.6569 21 20 21H4C2.34315 21 1 19.6569 1 18V6Z"
          fill="currentColor"
        ></path>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.23177 7.35981C5.58534 6.93553 6.2159 6.87821 6.64018 7.23177L11.3598 11.1648C11.7307 11.4738 12.2693 11.4738 12.6402 11.1648L17.3598 7.23177C17.7841 6.87821 18.4147 6.93553 18.7682 7.35981C19.1218 7.78409 19.0645 8.41465 18.6402 8.76822L13.9205 12.7012C12.808 13.6284 11.192 13.6284 10.0794 12.7012L5.35981 8.76822C4.93553 8.41465 4.87821 7.78409 5.23177 7.35981Z"
          fill="currentColor"
        ></path>
      </svg>
    ),
    label: 'Mail',
    route: 'mailto:anilseervi@duck.com'
  },
  null,
  {
    icon: <Changetheme />,
    label: 'Toggle Theme'
  }
];

function DockBottom() {
  const path = usePathname();

  return (
    <Dock>
      {NAVITEMS.map((item, index) =>
        item ? (
          <DockCard
            showDot={item.path === path}
            label={item.label}
            key={item.label}
          >
            {item.route ? (
              <a href={item.route} target="_blank" rel="noopener noreferrer">
                <span className="sr-only">{item.label}</span>
                {item.icon}
              </a>
            ) : item.path ? (
              <Link href={item.path}>
                <span className="sr-only">{item.label}</span>
                {item.icon}
              </Link>
            ) : (
              item.icon
            )}
          </DockCard>
        ) : (
          <DockDivider key={index} />
        )
      )}
    </Dock>
  );
}

export default DockBottom;
