function Hello() {
  return (
    <div class="w-screen flex items-center h-screen">
      <Header>
        <LogoContainer>
          <Logo />
        </LogoContainer>
        <CatchPhrase />
      </Header>
    </div>
  );
}

function Header({ children }) {
  return (
    <header class="w-full flex flex-col items-center justify-center">
      {children}
    </header>
  );
}

function LogoContainer({ children }) {
  return (
    <section class="bg-blue-400 h-56 shadow-lg w-4/5 rounded-lg flex items-center justify-center">
      {children}
    </section>
  );
}

function Logo() {
  return (
    <span class="text-6xl text-indigo-900 tracking-widest font-bold">Umca</span>
  );
}

function CatchPhrase() {
  return (
    <span class="text-xl mt-10">
      A simple SSR framework with JSX but without React.
    </span>
  );
}

export default Hello;
