import Display from "../components/Display";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LeftBoard from "../components/LeftBoard";

function Welcome() {

    return (
        <section className="min-h-screen flex flex-col">
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

export default Welcome;