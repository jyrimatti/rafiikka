{-# LANGUAGE ScopedTypeVariables, OverloadedStrings #-}

module Browser.Tippy (
    setContent, tippy, interactive, placement, offset, content
) where

import Universum
import Language.Javascript.JSaddle (JSM, (#), (!), MakeObject)
import Data.Text (pack)

tippy, interactive, placement, offset, content :: Text
tippy = "tippy"
interactive = "interactive"
placement = "placement"
offset = "offset"
content = "content"

setContent :: MakeObject e => e -> Text -> JSM ()
setContent reference cnt = do
    _ <- (reference ! pack "_tippy") # pack "setContent" $ cnt
    pure ()
