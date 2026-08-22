import Display from "./Display";
import Footer from "./Footer";
import Header from "./Header";
import LeftBoard from "./LeftBoard";

function AppLayout() {
  return (
    <section className="flex min-h-screen flex-col">
      <section className="flex-1">
        <Header />

        <section className="flex">
          <LeftBoard />
          <Display />
        </section>
      </section>

      <Footer />
    </section>
  );
}

export default AppLayout;
