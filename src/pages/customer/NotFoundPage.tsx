import { Link } from 'react-router';
import { Logo } from '../../brand/Logo';

export function NotFoundPage() {
  return (
    <section className="section">
      <div className="container container--narrow done__card">
        <Logo layout="monogram" height={56} />
        <span className="overline mt-24">404</span>
        <h1 className="display-md mt-8">페이지를 찾을 수 없어요</h1>
        <Link to="/" className="btn btn--primary mt-24">
          홈으로
        </Link>
      </div>
    </section>
  );
}
