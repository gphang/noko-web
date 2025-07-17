from fastapi import Depends, FastAPI, HTTPException, status, Request
from datetime import timedelta
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm
from utils.auth import authenticate_user, ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, fake_users_db, Token, get_current_active_user, User

# TODO: change to react, using simple html for testing login
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from src.database import get_book_from_db

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# TODO: change this to react code
templates = Jinja2Templates(directory="templates")
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/login")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


# public endpoint to serve storybook page
@app.get("/storybook", response_class=HTMLResponse)
async def read_storybook(request: Request):
    return templates.TemplateResponse("storybook.html", {"request": request})


# protected endpoint to fetch book data from db
@app.get("/books/{book_id}")
async def read_book(book_id: str, current_user: Annotated[User, Depends(get_current_active_user)]):
    try:
        book = get_book_from_db(book_id)
        if book:
            return book
        raise HTTPException(status_code=404, detail=f"book with Id '{book_id}' not found")
    except Exception as e:
        print(f"unexpected error occurred in 'read_book' endpoint: {e}")
        print(f"exception: {type(e)}")
        raise HTTPException(status_code=500, detail=f"unexpected server error: {e}")
