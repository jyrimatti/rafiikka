{-# LANGUAGE ScopedTypeVariables, TypeApplications #-}

module Browser (
    getElementById,
    setTimeout
) where

import FFI (procedure)
import Language.Javascript.JSaddle (JSM, jsg2)
import JSDOM (currentDocument)
import JSDOM.Types (Element)
import JSDOM.Generated.ParentNode (querySelector)
import Data.Text (Text, pack)
import Data.Time (NominalDiffTime)
import Shpadoinkle.Console (debug)

getElementById :: Text -> JSM (Maybe Element)
getElementById id_ = do
  debug @Show "getElementById"
  Just doc <- currentDocument
  doc `querySelector` (pack "#" <> id_)

setTimeout :: NominalDiffTime -> JSM () -> JSM ()
setTimeout timeout callback = do
  debug @Show "setTimeout"
  _ <- jsg2 (pack "foo") (procedure callback) $ round @NominalDiffTime @Int (timeout * 1000)
  pure ()
