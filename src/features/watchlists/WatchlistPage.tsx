import { useWatchlist } from "./useWatchlist";
import { ListGroup, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function WatchlistPage() {
  const { list, remove } = useWatchlist();

  if (list.length === 0) {
    return <p>Your watchlist appears to be empty. Go to the <Link to="/screener">Screener</Link> to add a stock ticker to your watchlist.</p>
  }

  return (
    <div>
      <h2 className="mb-3">Watchlist</h2>
      <ListGroup variant="flush">
        {list.map(t => (
          <ListGroup.Item key={t} className="d-flex align-items-center justify-content-between">
            <Link to={`/ticker/${t}`}>{t}</Link>
            <Button size="sm" variant="outline-danger" onClick={() => remove(t)}>Remove</Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  )
}
